
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnityNetworkAdapter, UnityStorageAdapter, UnityLoggerAdapter } from '../../platform/unity/unity-adapter';

// Mock Unity global object
const mockUnity = {
  Networking: {
    UnityWebRequest: {
      Get: vi.fn(),
      Post: vi.fn(),
      Put: vi.fn(),
      Delete: vi.fn(),
      Result: { Success: 0 }
    }
  },
  PlayerPrefs: {
    GetString: vi.fn(),
    SetString: vi.fn(),
    DeleteKey: vi.fn(),
    Save: vi.fn()
  },
  Debug: {
    Log: vi.fn(),
    LogWarning: vi.fn(),
    LogError: vi.fn()
  },
  WebSocket: {
    WebSocket: vi.fn(),
    WebSocketState: { Open: 1 }
  }
};

declare global {
  var Unity: typeof mockUnity;
}

global.Unity = mockUnity;

describe('UnityNetworkAdapter', () => {
  let adapter: UnityNetworkAdapter;

  beforeEach(() => {
    adapter = new UnityNetworkAdapter();
    vi.clearAllMocks();
  });

  describe('HTTP Methods', () => {
    it('should create GET request with proper configuration', async () => {
      const mockRequest = {
        SetRequestHeader: vi.fn(),
        SendWebRequest: vi.fn(() => ({
          completed: { AddListener: vi.fn((callback) => callback()) }
        })),
        result: Unity.Networking.UnityWebRequest.Result.Success,
        downloadHandler: { text: '{"success": true}' }
      };

      Unity.Networking.UnityWebRequest.Get.mockReturnValue(mockRequest);

      const result = await adapter.get('/test');

      expect(Unity.Networking.UnityWebRequest.Get).toHaveBeenCalledWith('/test');
      expect(result).toEqual({ success: true });
    });

    it('should create POST request with data and headers', async () => {
      const mockRequest = {
        SetRequestHeader: vi.fn(),
        SendWebRequest: vi.fn(() => ({
          completed: { AddListener: vi.fn((callback) => callback()) }
        })),
        result: Unity.Networking.UnityWebRequest.Result.Success,
        downloadHandler: { text: '{"id": 1}' }
      };

      Unity.Networking.UnityWebRequest.Post.mockReturnValue(mockRequest);

      const testData = { name: 'test' };
      const result = await adapter.post('/test', testData);

      expect(Unity.Networking.UnityWebRequest.Post).toHaveBeenCalledWith('/test', JSON.stringify(testData));
      expect(mockRequest.SetRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('WebSocket', () => {
    it('should connect and handle messages', () => {
      const mockWebSocket = {
        OnMessage: { AddLambda: vi.fn() },
        OnClosed: { AddLambda: vi.fn() },
        OnConnectionError: { AddLambda: vi.fn() },
        Connect: vi.fn(),
        IsConnected: vi.fn(() => true),
        Send: vi.fn(),
        Close: vi.fn()
      };

      Unity.WebSocket.WebSocket.mockReturnValue(mockWebSocket);

      const messageHandler = vi.fn();
      adapter.onMessage(messageHandler);
      adapter.connect('ws://test.com');

      expect(Unity.WebSocket.WebSocket).toHaveBeenCalledWith('ws://test.com');
      expect(mockWebSocket.Connect).toHaveBeenCalled();

      // Simulate message received
      const messageCallback = mockWebSocket.OnMessage.AddLambda.mock.calls[0][0];
      messageCallback('{"type": "test"}');

      expect(messageHandler).toHaveBeenCalledWith({ type: 'test' });
    });
  });
});

describe('UnityStorageAdapter', () => {
  let adapter: UnityStorageAdapter;

  beforeEach(() => {
    adapter = new UnityStorageAdapter();
    vi.clearAllMocks();
  });

  it('should get value from PlayerPrefs', async () => {
    Unity.PlayerPrefs.GetString.mockReturnValue('test_value');

    const result = await adapter.get('test_key');

    expect(Unity.PlayerPrefs.GetString).toHaveBeenCalledWith('BoredGamer_test_key', '');
    expect(result).toBe('test_value');
  });

  it('should return null for empty values', async () => {
    Unity.PlayerPrefs.GetString.mockReturnValue('');

    const result = await adapter.get('missing_key');

    expect(result).toBeNull();
  });

  it('should set value in PlayerPrefs', async () => {
    await adapter.set('test_key', 'test_value');

    expect(Unity.PlayerPrefs.SetString).toHaveBeenCalledWith('BoredGamer_test_key', 'test_value');
    expect(Unity.PlayerPrefs.Save).toHaveBeenCalled();
  });

  it('should remove value from PlayerPrefs', async () => {
    await adapter.remove('test_key');

    expect(Unity.PlayerPrefs.DeleteKey).toHaveBeenCalledWith('BoredGamer_test_key');
    expect(Unity.PlayerPrefs.Save).toHaveBeenCalled();
  });
});

describe('UnityLoggerAdapter', () => {
  let adapter: UnityLoggerAdapter;

  beforeEach(() => {
    adapter = new UnityLoggerAdapter();
    vi.clearAllMocks();
  });

  it('should log debug messages', () => {
    adapter.debug('Test debug message', { data: 'test' });

    expect(Unity.Debug.Log).toHaveBeenCalledWith('[DEBUG] Test debug message', { data: 'test' });
  });

  it('should log warning messages', () => {
    adapter.warn('Test warning message');

    expect(Unity.Debug.LogWarning).toHaveBeenCalledWith('[WARN] Test warning message');
  });

  it('should log error messages', () => {
    adapter.error('Test error message');

    expect(Unity.Debug.LogError).toHaveBeenCalledWith('[ERROR] Test error message');
  });
});
