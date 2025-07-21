
import { NetworkAdapter, StorageAdapter, LoggerAdapter } from '../types';

// Unity's C# functions will be exposed through a global Unity object
declare const Unity: any;

export class UnityNetworkAdapter implements NetworkAdapter {
  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = Unity.Networking.UnityWebRequest.Get(url);
      
      // Set headers
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          request.SetRequestHeader(key, value);
        });
      }

      request.SendWebRequest().completed.AddListener(() => {
        if (request.result === Unity.Networking.UnityWebRequest.Result.Success) {
          resolve(JSON.parse(request.downloadHandler.text));
        } else {
          reject(new Error(`Request failed: ${request.error}`));
        }
      });
    });
  }

  async post<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = Unity.Networking.UnityWebRequest.Post(url, JSON.stringify(data));
      request.SetRequestHeader('Content-Type', 'application/json');
      
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          request.SetRequestHeader(key, value);
        });
      }

      request.SendWebRequest().completed.AddListener(() => {
        if (request.result === Unity.Networking.UnityWebRequest.Result.Success) {
          resolve(JSON.parse(request.downloadHandler.text));
        } else {
          reject(new Error(`Request failed: ${request.error}`));
        }
      });
    });
  }

  async put<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = Unity.Networking.UnityWebRequest.Put(url, JSON.stringify(data));
      request.SetRequestHeader('Content-Type', 'application/json');
      
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          request.SetRequestHeader(key, value);
        });
      }

      request.SendWebRequest().completed.AddListener(() => {
        if (request.result === Unity.Networking.UnityWebRequest.Result.Success) {
          resolve(JSON.parse(request.downloadHandler.text));
        } else {
          reject(new Error(`Request failed: ${request.error}`));
        }
      });
    });
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = Unity.Networking.UnityWebRequest.Delete(url);
      
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          request.SetRequestHeader(key, value);
        });
      }

      request.SendWebRequest().completed.AddListener(() => {
        if (request.result === Unity.Networking.UnityWebRequest.Result.Success) {
          resolve(JSON.parse(request.downloadHandler.text));
        } else {
          reject(new Error(`Request failed: ${request.error}`));
        }
      });
    });
  }

  private webSocket?: any;
  private messageHandler?: (data: any) => void;
  private closeHandler?: () => void;
  private errorHandler?: (error: any) => void;

  connect(url: string): void {
    // Unity WebSocket implementation using NativeWebSocket package
    this.webSocket = new Unity.WebSocket.WebSocket(url);

    this.webSocket.OnMessage += (bytes: Uint8Array) => {
      if (this.messageHandler) {
        try {
          const message = new TextDecoder().decode(bytes);
          const data = JSON.parse(message);
          this.messageHandler(data);
        } catch (error) {
          Unity.Debug.LogError('Failed to parse WebSocket message: ' + error);
        }
      }
    };

    this.webSocket.OnClose += (closeCode: number) => {
      if (this.closeHandler) {
        this.closeHandler();
      }
    };

    this.webSocket.OnError += (error: string) => {
      if (this.errorHandler) {
        this.errorHandler(new Error(error));
      }
    };

    this.webSocket.Connect();
  }

  disconnect(): void {
    if (this.webSocket?.State === Unity.WebSocket.WebSocketState.Open) {
      this.webSocket.Close();
    }
  }

  send(data: any): void {
    if (this.webSocket?.State === Unity.WebSocket.WebSocketState.Open) {
      const message = JSON.stringify(data);
      const bytes = new TextEncoder().encode(message);
      this.webSocket.Send(bytes);
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

export class UnityStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    const value = Unity.PlayerPrefs.GetString(`BoredGamer_${key}`, '');
    return value === '' ? null : value;
  }

  async set(key: string, value: string): Promise<void> {
    Unity.PlayerPrefs.SetString(`BoredGamer_${key}`, value);
    Unity.PlayerPrefs.Save();
  }

  async remove(key: string): Promise<void> {
    Unity.PlayerPrefs.DeleteKey(`BoredGamer_${key}`);
    Unity.PlayerPrefs.Save();
  }
}

export class UnityLoggerAdapter implements LoggerAdapter {
  debug(message: string, ...args: any[]): void {
    Unity.Debug.Log(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    Unity.Debug.Log(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    Unity.Debug.LogWarning(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    Unity.Debug.LogError(`[ERROR] ${message}`, ...args);
  }
}
