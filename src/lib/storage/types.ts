export interface StorageAdapter {
  // Core operations
  saveScore(gameId: string, score: ScoreEntry): Promise<void>;
  getScores(gameId: string, options: QueryOptions): Promise<ScoreEntry[]>;
  deleteScore(gameId: string, scoreId: string): Promise<void>;
  
  // Batch operations
  batchSaveScores(gameId: string, scores: ScoreEntry[]): Promise<void>;
  
  // Maintenance
  cleanup(gameId: string, olderThan: Date): Promise<void>;
}

export interface ScoreEntry {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  score: number;
  category: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  verified: boolean;
}

export interface QueryOptions {
  category?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  filters?: Record<string, any>;
  sortOrder?: 'asc' | 'desc';
}
