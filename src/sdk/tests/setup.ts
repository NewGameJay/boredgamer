import { BoredGamerSDK } from '../index';

// Mock SDK configuration for testing
export const TEST_CONFIG = {
  apiKey: 'test-api-key',
  gameId: 'test-game-id',
  environment: 'development' as const,
  baseUrl: 'http://localhost:3001', // Local test server
};

// Helper to create a test SDK instance
export function createTestSDK(): BoredGamerSDK {
  return new BoredGamerSDK(TEST_CONFIG);
}

// Mock player data
export const TEST_PLAYERS = [
  { id: 'player1', username: 'SpeedRunner', avatarUrl: 'https://example.com/avatar1.png' },
  { id: 'player2', username: 'QuestMaster', avatarUrl: 'https://example.com/avatar2.png' },
  { id: 'player3', username: 'LeaderboardKing', avatarUrl: 'https://example.com/avatar3.png' },
];

// Mock game session data
export const TEST_SESSIONS = [
  {
    id: 'session1',
    playerId: 'player1',
    gameId: 'test-game-id',
    startTime: '2025-03-13T12:00:00Z',
    status: 'active',
  },
  {
    id: 'session2',
    playerId: 'player2',
    gameId: 'test-game-id',
    startTime: '2025-03-13T11:00:00Z',
    endTime: '2025-03-13T11:45:00Z',
    status: 'completed',
  },
];
