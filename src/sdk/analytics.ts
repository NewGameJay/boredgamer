
export interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface AnalyticsConfig {
  batchSize: number;
  flushInterval: number;
  debug: boolean;
  enableAutoTrack: boolean;
}

export class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private flushTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private config: AnalyticsConfig,
    private httpClient: any
  ) {
    this.sessionId = this.generateSessionId();
    this.startAutoFlush();
  }

  track(eventName: string, properties: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.events.push(event);

    if (this.config.debug) {
      console.log('[Analytics] Tracked event:', event);
    }

    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await this.httpClient.post('/analytics/events', {
        events: eventsToSend,
        sessionId: this.sessionId
      });
    } catch (error) {
      console.error('[Analytics] Failed to send events:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToSend);
    }
  }

  private startAutoFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  dispose() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}
