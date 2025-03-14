export type LeaderboardCategory = {
  id: string;
  name: string;
  description: string;
  sortOrder: 'asc' | 'desc';  // asc for time-based (faster is better), desc for score-based
  format: {
    type: 'number' | 'time' | 'custom';
    display?: string;         // e.g., "${value} kills" or "${value}s"
    precision?: number;       // decimal places for numbers
  };
  filters?: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean';
      name: string;
      description: string;
    };
  };
};

export type LeaderboardEntry = {
  id: string;
  gameId: string;
  categoryId: string;
  playerId: string;
  playerName: string;
  score: number;
  metadata?: Record<string, any>;
  timestamp: string;
  verified: boolean;
};

export type LeaderboardConfig = {
  gameId: string;
  categories: LeaderboardCategory[];
  displayOptions: {
    theme: 'light' | 'dark' | 'custom';
    customColors?: {
      background: string;
      text: string;
      accent: string;
    };
    showRank: boolean;
    showTimestamp: boolean;
    showMetadata: string[];  // List of metadata fields to display
  };
  moderationSettings: {
    autoVerify: boolean;
    scoreThresholds?: {
      min?: number;
      max?: number;
    };
    bannedPlayers: string[];  // List of player IDs
  };
};
