import { HttpClient } from './http-client';
import { WebSocketClient } from './websocket-client';
import { LeaderboardEntry, LeaderboardOptions, LeaderboardUpdateEvent } from './types';

export class LeaderboardManager {
  constructor(
    private apiClient: HttpClient,
    private wsClient: WebSocketClient
  ) {}

  async submitScore(event: LeaderboardUpdateEvent): Promise<void> {
    await this.apiClient.post('/leaderboard/submit', event);
    this.wsClient.send({
      type: 'leaderboard_update',
      data: event
    });
  }

  async getLeaderboard(gameId: string, options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
    const {
      timeframe = 'all',
      limit = 10,
      offset = 0,
      filters = {}
    } = options;

    const queryParams = new URLSearchParams({
      gameId,
      timeframe,
      limit: limit.toString(),
      offset: offset.toString(),
      ...filters
    });

    return this.apiClient.get<LeaderboardEntry[]>(`/leaderboard?${queryParams}`);
  }

  async getPlayerRank(gameId: string, playerId: string): Promise<LeaderboardEntry | null> {
    return this.apiClient.get<LeaderboardEntry | null>(`/leaderboard/${gameId}/player/${playerId}`);
  }

  subscribeToUpdates(gameId: string, callback: (entry: LeaderboardEntry) => void): void {
    this.wsClient.onMessage((message) => {
      if (message.type === 'leaderboard_update' && message.data.gameId === gameId) {
        callback(message.data);
      }
    });
  }

  unsubscribeFromUpdates(): void {
    this.wsClient.onMessage(null);
  }
}
