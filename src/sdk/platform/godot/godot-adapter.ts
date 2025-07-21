
import { NetworkAdapter, StorageAdapter, LoggerAdapter } from '../types';

// Godot's functions will be exposed through a global Godot object
declare const Godot: any;

export class GodotNetworkAdapter implements NetworkAdapter {
  private httpRequest?: any;

  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.httpRequest = Godot.HTTPRequest.new();
      
      // Set headers
      const headerArray: string[] = [];
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          headerArray.push(`${key}: ${value}`);
        });
      }

      this.httpRequest.request_completed.connect((result: number, response_code: number, headers: any, body: any) => {
        if (response_code >= 200 && response_code < 300) {
          try {
            const text = body.get_string_from_utf8();
            resolve(JSON.parse(text));
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Request failed with code: ${response_code}`));
        }
      });

      this.httpRequest.request(url, headerArray, true, Godot.HTTPClient.METHOD_GET);
    });
  }

  async post<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.httpRequest = Godot.HTTPRequest.new();
      
      const headerArray = ['Content-Type: application/json'];
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          headerArray.push(`${key}: ${value}`);
        });
      }

      this.httpRequest.request_completed.connect((result: number, response_code: number, headers: any, body: any) => {
        if (response_code >= 200 && response_code < 300) {
          try {
            const text = body.get_string_from_utf8();
            resolve(JSON.parse(text));
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Request failed with code: ${response_code}`));
        }
      });

      const jsonData = JSON.stringify(data);
      this.httpRequest.request(url, headerArray, true, Godot.HTTPClient.METHOD_POST, jsonData);
    });
  }

  async put<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.httpRequest = Godot.HTTPRequest.new();
      
      const headerArray = ['Content-Type: application/json'];
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          headerArray.push(`${key}: ${value}`);
        });
      }

      this.httpRequest.request_completed.connect((result: number, response_code: number, headers: any, body: any) => {
        if (response_code >= 200 && response_code < 300) {
          try {
            const text = body.get_string_from_utf8();
            resolve(JSON.parse(text));
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Request failed with code: ${response_code}`));
        }
      });

      const jsonData = JSON.stringify(data);
      this.httpRequest.request(url, headerArray, true, Godot.HTTPClient.METHOD_PUT, jsonData);
    });
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.httpRequest = Godot.HTTPRequest.new();
      
      const headerArray: string[] = [];
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          headerArray.push(`${key}: ${value}`);
        });
      }

      this.httpRequest.request_completed.connect((result: number, response_code: number, headers: any, body: any) => {
        if (response_code >= 200 && response_code < 300) {
          try {
            const text = body.get_string_from_utf8();
            resolve(JSON.parse(text));
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Request failed with code: ${response_code}`));
        }
      });

      this.httpRequest.request(url, headerArray, true, Godot.HTTPClient.METHOD_DELETE);
    });
  }

  private webSocket?: any;
  private messageHandler?: (data: any) => void;
  private closeHandler?: () => void;
  private errorHandler?: (error: any) => void;

  connect(url: string): void {
    this.webSocket = Godot.WebSocketClient.new();

    this.webSocket.connection_established.connect((protocol: string) => {
      Godot.print('WebSocket connected with protocol: ' + protocol);
    });

    this.webSocket.data_received.connect(() => {
      if (this.messageHandler) {
        try {
          const packet = this.webSocket.get_peer(1).get_packet();
          const message = packet.get_string_from_utf8();
          const data = JSON.parse(message);
          this.messageHandler(data);
        } catch (error) {
          Godot.print_rich('[color=red]Failed to parse WebSocket message: ' + error + '[/color]');
        }
      }
    });

    this.webSocket.connection_closed.connect((was_clean_close: boolean) => {
      if (this.closeHandler) {
        this.closeHandler();
      }
    });

    this.webSocket.connection_error.connect(() => {
      if (this.errorHandler) {
        this.errorHandler(new Error('WebSocket connection error'));
      }
    });

    this.webSocket.connect_to_url(url);
  }

  disconnect(): void {
    if (this.webSocket) {
      this.webSocket.disconnect_from_host();
    }
  }

  send(data: any): void {
    if (this.webSocket && this.webSocket.get_ready_state() === Godot.WebSocketPeer.STATE_OPEN) {
      const message = JSON.stringify(data);
      this.webSocket.get_peer(1).put_packet(message.to_utf8_buffer());
    }
  }

  onMessage(handler: (data: any) => void): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  onError(handler: (error: any) => void): void {
    this.errorHandler = handler;
  }
}

export class GodotStorageAdapter implements StorageAdapter {
  private configFile?: any;

  constructor() {
    this.configFile = Godot.ConfigFile.new();
    const error = this.configFile.load('user://boredgamer_data.cfg');
    if (error !== Godot.OK && error !== Godot.ERR_FILE_NOT_FOUND) {
      Godot.print_rich('[color=red]Failed to load config file: ' + error + '[/color]');
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.configFile.has_section_key('data', key)) {
      return null;
    }
    return this.configFile.get_value('data', key, null);
  }

  async set(key: string, value: string): Promise<void> {
    this.configFile.set_value('data', key, value);
    const error = this.configFile.save('user://boredgamer_data.cfg');
    if (error !== Godot.OK) {
      throw new Error(`Failed to save config file: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    if (this.configFile.has_section_key('data', key)) {
      this.configFile.erase_section_key('data', key);
      const error = this.configFile.save('user://boredgamer_data.cfg');
      if (error !== Godot.OK) {
        throw new Error(`Failed to save config file: ${error}`);
      }
    }
  }
}

export class GodotLoggerAdapter implements LoggerAdapter {
  debug(message: string, ...args: any[]): void {
    Godot.print(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    Godot.print(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    Godot.print_rich(`[color=yellow][WARN] ${message}[/color]`, ...args);
  }

  error(message: string, ...args: any[]): void {
    Godot.print_rich(`[color=red][ERROR] ${message}[/color]`, ...args);
  }
}
