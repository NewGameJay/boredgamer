import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { WebNetworkAdapter, WebStorageAdapter, WebLoggerAdapter } from '../../platform/web/web-adapter';

describe('WebNetworkAdapter', () => {
  let adapter: WebNetworkAdapter;
  let mockFetch: any;
  let mockWebSocket: any;

  beforeEach(() => {
    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock WebSocket
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
    };
    global.WebSocket = vi.fn(() => mockWebSocket) as any;

    adapter = new WebNetworkAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('HTTP Methods', () => {
    it('should make GET requests', async () => {
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.get('https://api.test.com/data');
      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/data', { headers: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should make POST requests with correct headers', async () => {
      const mockResponse = { success: true };
      const postData = { name: 'test' };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.post('https://api.test.com/data', postData);
      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('WebSocket Methods', () => {
    it('should connect to WebSocket server', () => {
      adapter.connect('wss://ws.test.com');
      expect(global.WebSocket).toHaveBeenCalledWith('wss://ws.test.com');
    });

    it('should send messages when connected', () => {
      adapter.connect('wss://ws.test.com');
      adapter.send({ type: 'test' });
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test' }));
    });

    it('should handle message events', () => {
      const mockHandler = vi.fn();
      adapter.onMessage(mockHandler);
      adapter.connect('wss://ws.test.com');

      // Simulate receiving a message
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({ type: 'test', data: 'data' }),
      });
      mockWebSocket.onmessage(messageEvent);

      expect(mockHandler).toHaveBeenCalledWith({ type: 'test', data: 'data' });
    });
  });
});

describe('WebStorageAdapter', () => {
  let adapter: WebStorageAdapter;
  let mockStorage: { [key: string]: string };

  beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
      getItem: vi.fn((key) => mockStorage[key]),
      setItem: vi.fn((key, value) => { mockStorage[key] = value; }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; }),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    adapter = new WebStorageAdapter();
  });

  it('should store and retrieve data', async () => {
    await adapter.set('test-key', 'test-value');
    const value = await adapter.get('test-key');
    expect(value).toBe('test-value');
    expect(localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
  });

  it('should remove data', async () => {
    await adapter.set('test-key', 'test-value');
    await adapter.remove('test-key');
    const value = await adapter.get('test-key');
    expect(value).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith('test-key');
  });
});

describe('WebLoggerAdapter', () => {
  let adapter: WebLoggerAdapter;
  let consoleSpy: {
    debug: any;
    info: any;
    warn: any;
    error: any;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(),
      info: vi.spyOn(console, 'info').mockImplementation(),
      warn: vi.spyOn(console, 'warn').mockImplementation(),
      error: vi.spyOn(console, 'error').mockImplementation(),
    };
    adapter = new WebLoggerAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should log messages at different levels', () => {
    adapter.debug('Debug message');
    adapter.info('Info message');
    adapter.warn('Warning message');
    adapter.error('Error message');

    expect(consoleSpy.debug).toHaveBeenCalledWith('Debug message');
    expect(consoleSpy.info).toHaveBeenCalledWith('Info message');
    expect(consoleSpy.warn).toHaveBeenCalledWith('Warning message');
    expect(consoleSpy.error).toHaveBeenCalledWith('Error message');
  });
});
