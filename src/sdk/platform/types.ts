export interface NetworkAdapter {
  // HTTP methods
  get<T>(url: string, headers?: Record<string, string>): Promise<T>;
  post<T>(url: string, data: any, headers?: Record<string, string>): Promise<T>;
  put<T>(url: string, data: any, headers?: Record<string, string>): Promise<T>;
  delete<T>(url: string, headers?: Record<string, string>): Promise<T>;

  // WebSocket methods
  connect(url: string, options?: any): void;
  disconnect(): void;
  send(data: any): void;
  onMessage(handler: (data: any) => void): void;
  onClose(handler: () => void): void;
  onError(handler: (error: any) => void): void;
}

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface LoggerAdapter {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
