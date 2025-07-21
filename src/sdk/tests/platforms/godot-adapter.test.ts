
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GodotNetworkAdapter, GodotStorageAdapter, GodotLoggerAdapter } from '../../platform/godot/godot-adapter';

// Mock Godot global object
const mockGodot = {
  HTTPRequest: {
    new: vi.fn()
  },
  HTTPClient: {
    METHOD_GET: 0,
    METHOD_POST: 1,
    METHOD_PUT: 2,
    METHOD_DELETE: 3
  },
  WebSocketClient: {
    new: vi.fn()
  },
  WebSocketPeer: {
    STATE_OPEN: 1
  },
  ConfigFile: {
    new: vi.fn()
  },
  OK: 0,
  ERR_FILE_NOT_FOUND: 7,
  print: vi.fn(),
  print_rich: vi.fn()
};

declare global {
  var Godot: typeof mockGodot;
}

global.Godot = mockGodot;

describe('GodotNetworkAdapter', () => {
  let adapter: GodotNetworkAdapter;

  beforeEach(() => {
    adapter = new GodotNetworkAdapter();
    vi.clearAllMocks();
  });

  describe('HTTP Methods', () => {
    it('should create GET request', async () => {
      const mockHttpRequest = {
        request_completed: { connect: vi.fn() },
        request: vi.fn()
      };

      Godot.HTTPRequest.new.mockReturnValue(mockHttpRequest);

      const promise = adapter.get('/test');

      // Simulate successful response
      const connectCallback = mockHttpRequest.request_completed.connect.mock.calls[0][0];
      const mockBody = { get_string_from_utf8: () => '{"success": true}' };
      connectCallback(0, 200, [], mockBody);

      const result = await promise;

      expect(mockHttpRequest.request).toHaveBeenCalledWith('/test', [], true, Godot.HTTPClient.METHOD_GET);
      expect(result).toEqual({ success: true });
    });

    it('should create POST request with data', async () => {
      const mockHttpRequest = {
        request_completed: { connect: vi.fn() },
        request: vi.fn()
      };

      Godot.HTTPRequest.new.mockReturnValue(mockHttpRequest);

      const testData = { name: 'test' };
      const promise = adapter.post('/test', testData);

      // Simulate successful response
      const connectCallback = mockHttpRequest.request_completed.connect.mock.calls[0][0];
      const mockBody = { get_string_from_utf8: () => '{"id": 1}' };
      connectCallback(0, 201, [], mockBody);

      const result = await promise;

      expect(mockHttpRequest.request).toHaveBeenCalledWith(
        '/test',
        ['Content-Type: application/json'],
        true,
        Godot.HTTPClient.METHOD_POST,
        JSON.stringify(testData)
      );
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('WebSocket', () => {
    it('should connect and handle events', () => {
      const mockWebSocket = {
        connection_established: { connect: vi.fn() },
        data_received: { connect: vi.fn() },
        connection_closed: { connect: vi.fn() },
        connection_error: { connect: vi.fn() },
        connect_to_url: vi.fn(),
        get_ready_state: vi.fn(() => Godot.WebSocketPeer.STATE_OPEN),
        get_peer: vi.fn(() => ({
          get_packet: vi.fn(() => ({ get_string_from_utf8: () => '{"type": "test"}' })),
          put_packet: vi.fn()
        })),
        disconnect_from_host: vi.fn()
      };

      Godot.WebSocketClient.new.mockReturnValue(mockWebSocket);

      const messageHandler = vi.fn();
      adapter.onMessage(messageHandler);
      adapter.connect('ws://test.com');

      expect(mockWebSocket.connect_to_url).toHaveBeenCalledWith('ws://test.com');

      // Simulate message received
      const dataReceivedCallback = mockWebSocket.data_received.connect.mock.calls[0][0];
      dataReceivedCallback();

      expect(messageHandler).toHaveBeenCalledWith({ type: 'test' });
    });
  });
});

describe('GodotStorageAdapter', () => {
  let adapter: GodotStorageAdapter;

  beforeEach(() => {
    const mockConfigFile = {
      load: vi.fn(() => Godot.OK),
      has_section_key: vi.fn(),
      get_value: vi.fn(),
      set_value: vi.fn(),
      save: vi.fn(() => Godot.OK),
      erase_section_key: vi.fn()
    };

    Godot.ConfigFile.new.mockReturnValue(mockConfigFile);
    adapter = new GodotStorageAdapter();
    vi.clearAllMocks();
  });

  it('should get value from config file', async () => {
    const mockConfigFile = Godot.ConfigFile.new();
    mockConfigFile.has_section_key.mockReturnValue(true);
    mockConfigFile.get_value.mockReturnValue('test_value');

    const result = await adapter.get('test_key');

    expect(mockConfigFile.has_section_key).toHaveBeenCalledWith('data', 'test_key');
    expect(mockConfigFile.get_value).toHaveBeenCalledWith('data', 'test_key', null);
    expect(result).toBe('test_value');
  });

  it('should return null for missing keys', async () => {
    const mockConfigFile = Godot.ConfigFile.new();
    mockConfigFile.has_section_key.mockReturnValue(false);

    const result = await adapter.get('missing_key');

    expect(result).toBeNull();
  });

  it('should set value in config file', async () => {
    const mockConfigFile = Godot.ConfigFile.new();

    await adapter.set('test_key', 'test_value');

    expect(mockConfigFile.set_value).toHaveBeenCalledWith('data', 'test_key', 'test_value');
    expect(mockConfigFile.save).toHaveBeenCalledWith('user://boredgamer_data.cfg');
  });
});

describe('GodotLoggerAdapter', () => {
  let adapter: GodotLoggerAdapter;

  beforeEach(() => {
    adapter = new GodotLoggerAdapter();
    vi.clearAllMocks();
  });

  it('should log debug messages', () => {
    adapter.debug('Test debug message', { data: 'test' });

    expect(Godot.print).toHaveBeenCalledWith('[DEBUG] Test debug message', { data: 'test' });
  });

  it('should log warning messages with color', () => {
    adapter.warn('Test warning message');

    expect(Godot.print_rich).toHaveBeenCalledWith('[color=yellow][WARN] Test warning message[/color]');
  });

  it('should log error messages with color', () => {
    adapter.error('Test error message');

    expect(Godot.print_rich).toHaveBeenCalledWith('[color=red][ERROR] Test error message[/color]');
  });
});
