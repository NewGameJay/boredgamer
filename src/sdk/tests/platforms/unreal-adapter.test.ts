import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { UnrealNetworkAdapter, UnrealStorageAdapter, UnrealLoggerAdapter } from '../../platform/unreal/unreal-adapter';

// Mock Unreal Engine's global object
const mockStorage = new Map<string, string>();
const mockUE = {
  HttpModule: {
    CreateRequest: () => ({
      SetURL: vi.fn().mockReturnThis(),
      SetVerb: vi.fn().mockReturnThis(),
      SetHeaders: vi.fn().mockReturnThis(),
      SetContentAsString: vi.fn().mockReturnThis(),
      OnProcessRequestComplete: vi.fn().mockImplementation((callback) => {
        // Simulate successful response
        setTimeout(() => {
          callback({
            GetContentAsString: () => JSON.stringify({ success: true, data: 'mock response' })
          }, true);
        }, 10);
        return { ProcessRequest: vi.fn() };
      })
    })
  },
  WebSocketsModule: {
    CreateWebSocket: (url: string) => ({
      url,
      connected: false,
      OnMessage: { AddLambda: vi.fn() },
      OnClosed: { AddLambda: vi.fn() },
      OnConnectionError: { AddLambda: vi.fn() },
      Connect: function() { this.connected = true; },
      Close: function() { this.connected = false; },
      IsConnected: function() { return this.connected; },
      Send: vi.fn()
    })
  },
  GameplayStatics: {
    GetGameInstance: () => ({
      GetGameSave: () => ({
        storage: mockStorage,
        GetString: (key: string) => mockStorage.get(key) || null,
        SetString: (key: string, value: string) => mockStorage.set(key, value),
        RemoveKey: (key: string) => mockStorage.delete(key),
        SaveToSlot: vi.fn()
      })
    }),
    SaveGame: vi.fn((data: any) => {
      const { key, value } = data;
      mockStorage.set(key, value);
      return true;
    }),
    LoadGame: vi.fn((key: string) => {
      return mockStorage.get(key) || null;
    })
  },
  Log: {
    Log: vi.fn(),
    Warning: vi.fn(),
    Error: vi.fn()
  }
};

// Assign mock to global
(global as any).UE = mockUE;

describe('UnrealNetworkAdapter', () => {
  let adapter: UnrealNetworkAdapter;

  beforeEach(() => {
    adapter = new UnrealNetworkAdapter();
    vi.clearAllMocks();
  });

  describe('HTTP Methods', () => {
    it('should make GET requests', async () => {
      const result = await adapter.get('https://api.test.com/data');
      expect(result).toEqual({ success: true, data: 'mock response' });
    });

    it('should make POST requests with correct content', async () => {
      const postData = { name: 'test' };
      const result = await adapter.post('https://api.test.com/data', postData);
      expect(result).toEqual({ success: true, data: 'mock response' });
    });
  });

  describe('WebSocket Methods', () => {
    it('should connect to WebSocket server', () => {
      adapter.connect('wss://ws.test.com');
      const socket = adapter['socket'];
      expect(socket.IsConnected()).toBe(true);
    });

    it('should handle message events', () => {
      const mockHandler = vi.fn();
      adapter.onMessage(mockHandler);
      adapter.connect('wss://ws.test.com');

      // Get the socket instance
      const socket = adapter['socket'];
      
      // Simulate a message by calling the message handler directly
      socket.OnMessage.AddLambda.mock.calls[0][0](JSON.stringify({ type: 'test', data: 'data' }));
      
      expect(mockHandler).toHaveBeenCalledWith({ type: 'test', data: 'data' });
    });

    it('should handle disconnection', () => {
      const mockHandler = vi.fn();
      adapter.onClose(mockHandler);
      adapter.connect('wss://ws.test.com');
      adapter.disconnect();

      const socket = adapter['socket'];
      expect(socket.IsConnected()).toBe(false);
    });
  });
});

describe('UnrealStorageAdapter', () => {
  let adapter: UnrealStorageAdapter;

  beforeEach(() => {
    adapter = new UnrealStorageAdapter();
  });

  it('should store and retrieve data', async () => {
    await adapter.set('test-key', 'test-value');
    const value = await adapter.get('test-key');
    expect(value).toBe('test-value');
    expect(mockStorage.get('test-key')).toBe('test-value');
  });

  it('should remove data', async () => {
    await adapter.remove('test-key');
    const value = await adapter.get('test-key');
    expect(value).toBeNull();
    expect(mockStorage.has('test-key')).toBe(false);
  });
});

describe('UnrealLoggerAdapter', () => {
  let adapter: UnrealLoggerAdapter;

  beforeEach(() => {
    adapter = new UnrealLoggerAdapter();
    vi.clearAllMocks();
  });

  it('should log messages at different levels', () => {
    adapter.debug('Debug message');
    adapter.info('Info message');
    adapter.warn('Warning message');
    adapter.error('Error message');

    expect(mockUE.Log.Log).toHaveBeenCalledWith('[DEBUG] Debug message');
    expect(mockUE.Log.Log).toHaveBeenCalledWith('[INFO] Info message');
    expect(mockUE.Log.Warning).toHaveBeenCalledWith('[WARN] Warning message');
    expect(mockUE.Log.Error).toHaveBeenCalledWith('[ERROR] Error message');
  });
});
