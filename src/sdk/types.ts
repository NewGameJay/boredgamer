export interface BoredGamerConfig {
  gameId: string;
  apiKey: string;
  apiUrl?: string;
  wsUrl?: string;
  playerId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

export interface Player {
  id: string;
  name: string;
  metadata?: Record<string, any>;
}

export interface GameSession {
  id: string;
  playerId: string;
  startTime: string;
  endTime?: string;
  metadata?: Record<string, any>;
}

// Leaderboard Types
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface LeaderboardOptions {
  timeframe?: 'all' | 'daily' | 'weekly' | 'monthly';
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

export interface LeaderboardUpdateEvent {
  gameId: string;
  playerId: string;
  playerName: string;
  score: number;
  metadata?: Record<string, any>;
}
