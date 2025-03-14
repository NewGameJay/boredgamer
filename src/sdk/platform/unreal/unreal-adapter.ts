import { NetworkAdapter, StorageAdapter, LoggerAdapter } from '../types';

// Unreal Engine's C++ functions will be exposed through a global UE object
declare const UE: any;

export class UnrealNetworkAdapter implements NetworkAdapter {
  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      UE.HttpModule.CreateRequest()
        .SetURL(url)
        .SetVerb('GET')
        .SetHeaders(headers || {})
        .OnProcessRequestComplete((response: any, success: boolean) => {
          if (success) {
            resolve(JSON.parse(response.GetContentAsString()));
          } else {
            reject(new Error('Request failed'));
          }
        })
        .ProcessRequest();
    });
  }

  async post<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      UE.HttpModule.CreateRequest()
        .SetURL(url)
        .SetVerb('POST')
        .SetHeaders({ 'Content-Type': 'application/json', ...headers })
        .SetContentAsString(JSON.stringify(data))
        .OnProcessRequestComplete((response: any, success: boolean) => {
          if (success) {
            resolve(JSON.parse(response.GetContentAsString()));
          } else {
            reject(new Error('Request failed'));
          }
        })
        .ProcessRequest();
    });
  }

  async put<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      UE.HttpModule.CreateRequest()
        .SetURL(url)
        .SetVerb('PUT')
        .SetHeaders({ 'Content-Type': 'application/json', ...headers })
        .SetContentAsString(JSON.stringify(data))
        .OnProcessRequestComplete((response: any, success: boolean) => {
          if (success) {
            resolve(JSON.parse(response.GetContentAsString()));
          } else {
            reject(new Error('Request failed'));
          }
        })
        .ProcessRequest();
    });
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
      UE.HttpModule.CreateRequest()
        .SetURL(url)
        .SetVerb('DELETE')
        .SetHeaders(headers || {})
        .OnProcessRequestComplete((response: any, success: boolean) => {
          if (success) {
            resolve(JSON.parse(response.GetContentAsString()));
          } else {
            reject(new Error('Request failed'));
          }
        })
        .ProcessRequest();
    });
  }

  private socket?: any; // UWebSocket reference
  private messageHandler?: (data: any) => void;
  private closeHandler?: () => void;
  private errorHandler?: (error: any) => void;

  connect(url: string): void {
    this.socket = UE.WebSocketsModule.CreateWebSocket(url);

    this.socket.OnMessage.AddLambda((message: string) => {
      if (this.messageHandler) {
        try {
          const data = JSON.parse(message);
          this.messageHandler(data);
        } catch (error) {
          UE.Log.Error('Failed to parse WebSocket message: ' + error);
        }
      }
    });

    this.socket.OnClosed.AddLambda(() => {
      if (this.closeHandler) {
        this.closeHandler();
      }
    });

    this.socket.OnConnectionError.AddLambda((error: any) => {
      if (this.errorHandler) {
        this.errorHandler(error);
      }
    });

    this.socket.Connect();
  }

  disconnect(): void {
    this.socket?.Close();
  }

  send(data: any): void {
    if (this.socket?.IsConnected()) {
      this.socket.Send(JSON.stringify(data));
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

export class UnrealStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    return UE.GameplayStatics.GetGameInstance().GetGameSave().GetString(key, null);
  }

  async set(key: string, value: string): Promise<void> {
    const save = UE.GameplayStatics.GetGameInstance().GetGameSave();
    save.SetString(key, value);
    save.SaveToSlot('BoredGamerSave', 0);
  }

  async remove(key: string): Promise<void> {
    const save = UE.GameplayStatics.GetGameInstance().GetGameSave();
    save.RemoveKey(key);
    save.SaveToSlot('BoredGamerSave', 0);
  }
}

export class UnrealLoggerAdapter implements LoggerAdapter {
  debug(message: string, ...args: any[]): void {
    UE.Log.Log('[DEBUG] ' + message, ...args);
  }

  info(message: string, ...args: any[]): void {
    UE.Log.Log('[INFO] ' + message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    UE.Log.Warning('[WARN] ' + message, ...args);
  }

  error(message: string, ...args: any[]): void {
    UE.Log.Error('[ERROR] ' + message, ...args);
  }
}
