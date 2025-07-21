import { BoredGamerConfig, ApiResponse, Player, GameSession, LeaderboardEntry, LeaderboardOptions, LeaderboardUpdateEvent } from './types';
import { HttpClient } from './http-client';
import { WebSocketClient } from './websocket-client';
import { LeaderboardManager } from './leaderboard';
import { AnalyticsManager } from './analytics';
import { AdvancedStorageManager } from './storage';
import { RetryManager, CircuitBreaker } from './resilience';
import { AdvancedWebSocketClient } from './advanced-websocket';

export class BoredGamerSDK {
  private http: HttpClient;
  private ws: WebSocketClient;
  private advancedWs: AdvancedWebSocketClient;
  private leaderboard: LeaderboardManager;
  private analytics: AnalyticsManager;
  private storage: AdvancedStorageManager;
  private retryManager: RetryManager;
  private circuitBreaker: CircuitBreaker;
  private initialized = false;
  private playerId: string | null = null;

  constructor(private config: BoredGamerConfig & { 
    advanced?: {
      analytics?: boolean;
      storage?: boolean;
      resilience?: boolean;
      advancedWebSocket?: boolean;
    }
  }) {
    this.http = new HttpClient(config);
    this.ws = new WebSocketClient(config);
    this.leaderboard = new LeaderboardManager(this.http, this.ws);

    // Initialize advanced features if enabled
    if (config.advanced?.analytics !== false) {
      this.analytics = new AnalyticsManager({
        batchSize: 10,
        flushInterval: 5000,
        debug: false,
        enableAutoTrack: true
      }, this.http);
    }

    if (config.advanced?.resilience !== false) {
      this.retryManager = new RetryManager({
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        exponentialBase: 2
      });

      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringPeriod: 60000
      });
    }

    if (config.advanced?.advancedWebSocket !== false) {
      const wsUrl = config.wsUrl || 'wss://api.boredgamer.com/ws';
      this.advancedWs = new AdvancedWebSocketClient(wsUrl, {
        enableCompression: true,
        enableMessageQueue: true,
        maxQueueSize: 100,
        heartbeatInterval: 30000,
        enableBinaryTransport: false
      });
    }
  }

  /**
   * Initialize the SDK and establish connections
   */
  public async initialize(): Promise<ApiResponse<{ status: string }>> {
    try {
      // Test API connection first
      await this.http.get('/health');

      // Initialize WebSocket connection (non-blocking)
      this.ws.connect().catch(error => {
        console.warn('WebSocket connection failed:', error);
        // Don't throw, WebSocket is optional
      });

      // Initialize player ID
      this.playerId = this.config.playerId || await this.generatePlayerId();

      this.initialized = true;
      return {
        success: true,
        data: { status: 'initialized' }
      };
    } catch (error: any) {
      this.initialized = false;
      return {
        success: false,
        data: { status: 'failed' },
        error: error.error || error.message || 'Failed to initialize SDK'
      };
    }
  }

  /**
   * Start a new game session
   */
  public async startSession(): Promise<ApiResponse<GameSession>> {
    const session = await this.http.post<GameSession>('/sessions/start', {
      playerId: this.playerId
    });
    return {
      success: true,
      data: session
    };
  }

  /**
   * End the current game session
   */
  public async endSession(sessionId: string): Promise<ApiResponse<GameSession>> {
    const session = await this.http.post<GameSession>(`/sessions/${sessionId}/end`, {});
    return {
      success: true,
      data: session
    };
  }

  /**
   * Get player information
   */
  public async getPlayer(playerId: string): Promise<ApiResponse<Player>> {
    const player = await this.http.get<Player>(`/players/${playerId}`);
    return {
      success: true,
      data: player
    };
  }

  /**
   * Subscribe to real-time events
   */
  public onEvent<T>(event: string, handler: (data: T) => void): () => void {
    return this.ws.subscribe(event, handler);
  }

  /**
   * Leaderboard methods
   */
  public async submitScore(score: number, playerName: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.playerId) {
      throw new Error('Player ID not initialized');
    }

    const event: LeaderboardUpdateEvent = {
      gameId: this.config.gameId,
      playerId: this.playerId,
      playerName,
      score,
      metadata
    };

    await this.leaderboard.submitScore(event);
  }

  public async getLeaderboard(options?: LeaderboardOptions): Promise<LeaderboardEntry[]> {
    return this.leaderboard.getLeaderboard(this.config.gameId, options);
  }

  public async getPlayerRank(playerId: string): Promise<LeaderboardEntry | null> {
    return this.leaderboard.getPlayerRank(this.config.gameId, playerId);
  }

  public onLeaderboardUpdate(callback: (entry: LeaderboardEntry) => void): void {
    this.leaderboard.subscribeToUpdates(this.config.gameId, callback);
  }

  /**
   * Analytics methods
   */
  public trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (this.analytics) {
      this.analytics.track(eventName, properties);
    }
  }

  public async flushAnalytics(): Promise<void> {
    if (this.analytics) {
      await this.analytics.flush();
    }
  }

  /**
   * Advanced WebSocket methods
   */
  public subscribeAdvanced(event: string, handler: (data: any) => void): () => void {
    if (this.advancedWs) {
      return this.advancedWs.subscribe(event, handler);
    }
    return () => {};
  }

  public sendAdvanced(type: string, data: any, priority = 1): void {
    if (this.advancedWs) {
      this.advancedWs.send(type, data, priority);
    }
  }

  /**
   * Resilient API calls
   */
  public async resilientRequest<T>(operation: () => Promise<T>): Promise<T> {
    if (this.retryManager && this.circuitBreaker) {
      return this.retryManager.executeWithRetry(operation, this.circuitBreaker);
    }
    return operation();
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus(): string {
    return this.circuitBreaker?.getState() || 'UNKNOWN';
  }

  /**
   * Clean up SDK resources
   */
  public dispose(): void {
    this.ws.disconnect();
    this.advancedWs?.disconnect();
    this.leaderboard.unsubscribeFromUpdates();
    this.analytics?.dispose();
    this.initialized = false;
  }

  private async generatePlayerId(): Promise<string> {
    // Generate a UUID for the player
    return crypto.randomUUID();
  }
}

// Export types
export * from './http-client';
export * from './websocket-client';
export * from './leaderboard';
export * from './types';
export * from './platform/types';
export * from './platform/platform-factory';
export * from './platform/platform-detector';