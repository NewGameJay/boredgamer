
export interface QueuedMessage {
  id: string;
  data: any;
  timestamp: number;
  attempts: number;
  priority: number;
}

export interface AdvancedWebSocketConfig {
  enableCompression: boolean;
  enableMessageQueue: boolean;
  maxQueueSize: number;
  heartbeatInterval: number;
  enableBinaryTransport: boolean;
}

export class AdvancedWebSocketClient {
  private ws: WebSocket | null = null;
  private messageQueue: QueuedMessage[] = [];
  private eventHandlers = new Map<string, ((data: any) => void)[]>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(
    private url: string,
    private config: AdvancedWebSocketConfig
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[AdvancedWebSocket] Connected');
        this.isConnected = true;
        this.startHeartbeat();
        this.processQueuedMessages();
        resolve();
      };

      this.ws.onclose = () => {
        console.log('[AdvancedWebSocket] Disconnected');
        this.isConnected = false;
        this.stopHeartbeat();
      };

      this.ws.onerror = (error) => {
        console.error('[AdvancedWebSocket] Error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };
    });
  }

  send(type: string, data: any, priority = 1): void {
    const message: QueuedMessage = {
      id: crypto.randomUUID(),
      data: { type, data },
      timestamp: Date.now(),
      attempts: 0,
      priority
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(message);
    } else if (this.config.enableMessageQueue) {
      this.queueMessage(message);
    }
  }

  subscribe(event: string, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  private sendMessage(message: QueuedMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      let payload = message.data;

      if (this.config.enableCompression) {
        payload = this.compress(JSON.stringify(payload));
      }

      if (this.config.enableBinaryTransport && payload instanceof ArrayBuffer) {
        this.ws.send(payload);
      } else {
        this.ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
      }
    } catch (error) {
      console.error('[AdvancedWebSocket] Failed to send message:', error);
      if (this.config.enableMessageQueue) {
        this.queueMessage(message);
      }
    }
  }

  private queueMessage(message: QueuedMessage): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority message
      const lowPriorityIndex = this.messageQueue.findIndex(m => m.priority === 1);
      if (lowPriorityIndex > -1) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        this.messageQueue.shift(); // Remove oldest message
      }
    }

    // Insert message based on priority
    const insertIndex = this.messageQueue.findIndex(m => m.priority < message.priority);
    if (insertIndex === -1) {
      this.messageQueue.push(message);
    } else {
      this.messageQueue.splice(insertIndex, 0, message);
    }
  }

  private processQueuedMessages(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message);
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      let data = event.data;
      
      if (this.config.enableCompression && typeof data === 'string') {
        try {
          data = this.decompress(data);
        } catch {
          // If decompression fails, assume it's not compressed
        }
      }

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (parsed.type) {
        const handlers = this.eventHandlers.get(parsed.type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(parsed.data);
            } catch (error) {
              console.error('[AdvancedWebSocket] Handler error:', error);
            }
          });
        }
      }
    } catch (error) {
      console.error('[AdvancedWebSocket] Failed to handle message:', error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', { timestamp: Date.now() }, 10); // High priority
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private compress(data: string): string {
    // Simple compression using LZ-string or similar library
    // For now, return as-is (implement actual compression as needed)
    return data;
  }

  private decompress(data: string): string {
    // Simple decompression
    return data;
  }

  disconnect(): void {
    this.isConnected = false;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
