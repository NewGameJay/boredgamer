import { BoredGamerConfig, ApiResponse, Player, GameSession, LeaderboardEntry, LeaderboardOptions, LeaderboardUpdateEvent } from './types';
import { HttpClient } from './http-client';
import { WebSocketClient } from './websocket-client';
import { LeaderboardManager } from './leaderboard';

export class BoredGamerSDK {
  private http: HttpClient;
  private ws: WebSocketClient;
  private leaderboard: LeaderboardManager;
  private initialized = false;
  private playerId: string | null = null;

  constructor(private config: BoredGamerConfig) {
    this.http = new HttpClient(config);
    this.ws = new WebSocketClient(config);
    this.leaderboard = new LeaderboardManager(this.http, this.ws);
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
   * Clean up SDK resources
   */
  public dispose(): void {
    this.ws.disconnect();
    this.leaderboard.unsubscribeFromUpdates();
    this.initialized = false;
  }

  private async generatePlayerId(): Promise<string> {
    // Generate a UUID for the player
    return crypto.randomUUID();
  }
}

// Export types
export * from './types';

// Create default instance
let defaultInstance: BoredGamerSDK | null = null;

/**
 * Initialize the default SDK instance
 */
export function initializeSDK(config: BoredGamerConfig): BoredGamerSDK {
  if (!defaultInstance) {
    defaultInstance = new BoredGamerSDK(config);
  }
  return defaultInstance;
}

/**
 * Get the default SDK instance
 */
export function getSDK(): BoredGamerSDK {
  if (!defaultInstance) {
    throw new Error('SDK not initialized. Call initializeSDK first.');
  }
  return defaultInstance;
}
