import { NetworkAdapter, StorageAdapter, LoggerAdapter } from '../types';

export class WebNetworkAdapter implements NetworkAdapter {
  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(url, { headers });
    return response.json();
  }

  async post<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async put<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return response.json();
  }

  private ws?: WebSocket;
  private messageHandler?: (data: any) => void;
  private closeHandler?: () => void;
  private errorHandler?: (error: any) => void;

  connect(url: string): void {
    if (typeof window === 'undefined') return;
    
    this.ws = new WebSocket(url);
    
    this.ws.onmessage = (event) => {
      if (this.messageHandler) {
        try {
          const data = JSON.parse(event.data);
          this.messageHandler(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      }
    };

    this.ws.onclose = () => {
      if (this.closeHandler) {
        this.closeHandler();
      }
    };

    this.ws.onerror = (error) => {
      if (this.errorHandler) {
        this.errorHandler(error);
      }
    };
  }

  disconnect(): void {
    this.ws?.close();
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
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

export class WebStorageAdapter implements StorageAdapter {
  private isClient = typeof window !== 'undefined';

  async get(key: string): Promise<string | null> {
    if (!this.isClient) return null;
    const value = localStorage.getItem(key);
    return value === null || value === undefined ? null : value;
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.isClient) return;
    localStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    if (!this.isClient) return;
    localStorage.removeItem(key);
  }
}

export class WebLoggerAdapter implements LoggerAdapter {
  debug(message: string, ...args: any[]): void {
    console.debug(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.info(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }
}
