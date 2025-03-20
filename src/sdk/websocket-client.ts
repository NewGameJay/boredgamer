import { BoredGamerConfig } from './types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandler: ((data: any) => void) | null = null;
  private reconnectInterval = 1000;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;

  constructor(private config: BoredGamerConfig) {}

  async connect(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const wsUrl = this.config.wsUrl || 'wss://api.boredgamer.com/ws';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(error);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandler?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    });
  }

  send(data: any): void {
    if (typeof window === 'undefined') return;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: (data: any) => void): void {
    this.messageHandler = handler;
  }

  dispose(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1));
  }
}
