import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect, vi } from 'vitest';
import { BoredGamerSDK } from '../index';
import { startMockServer } from './mock-server';

function createTestSDK() {
  return new BoredGamerSDK({
    apiKey: 'test-api-key',
    gameId: 'test-game',
    apiUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:3001/ws'
  });
}

describe('BoredGamerSDK', () => {
  let sdk: BoredGamerSDK;
  let mockServer: any;
  let sdks: BoredGamerSDK[] = [];

  beforeAll(async () => {
    mockServer = await startMockServer();
  });

  beforeEach(async () => {
    sdk = createTestSDK();
    sdks.push(sdk);
    const result = await sdk.initialize();
    expect(result.success).toBe(true);
  });

  afterEach(() => {
    // Clean up all SDK instances
    sdks.forEach(sdk => sdk.dispose());
    sdks = [];
  });

  afterAll(async () => {
    await mockServer.close();
  });

  describe('Core Functionality', () => {
    it('should initialize successfully', async () => {
      const result = await sdk.initialize();
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('initialized');
    });

    it('should handle API errors gracefully', async () => {
      // Create a new SDK instance with invalid API URL
      const badSdk = new BoredGamerSDK({
        apiKey: 'test-api-key',
        gameId: 'test-game',
        apiUrl: 'http://invalid-url',
        wsUrl: 'ws://invalid-url/ws'
      });
      sdks.push(badSdk);

      const result = await badSdk.initialize();
      expect(result.success).toBe(false);
      expect(result.data.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('should generate unique player IDs', async () => {
      const sdk1 = createTestSDK();
      const sdk2 = createTestSDK();
      sdks.push(sdk1, sdk2);

      await sdk1.initialize();
      await sdk2.initialize();

      await sdk1.submitScore(100, 'Player 1');
      await sdk2.submitScore(200, 'Player 2');

      const leaderboard = await sdk1.getLeaderboard();
      expect(leaderboard.length).toBe(2);
      expect(leaderboard[0].playerName).toBe('Player 2');
      expect(leaderboard[1].playerName).toBe('Player 1');
    });
  });

  describe('Session Management', () => {
    it('should start a new session', async () => {
      const result = await sdk.startSession();
      expect(result.success).toBe(true);
      expect(result.data.playerId).toBeDefined();
      expect(result.data.startTime).toBeDefined();
    });

    it('should end an active session', async () => {
      const startResult = await sdk.startSession();
      const sessionId = startResult.data.id;

      const endResult = await sdk.endSession(sessionId);
      expect(endResult.success).toBe(true);
      expect(endResult.data.endTime).toBeDefined();
    });
  });

  describe('Real-time Events', () => {
    it('should handle leaderboard updates', async () => {
      const updateHandler = vi.fn();
      sdk.onLeaderboardUpdate(updateHandler);

      await sdk.submitScore(100, 'Test Player');

      // Wait for WebSocket message
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(updateHandler).toHaveBeenCalledWith(expect.objectContaining({
        score: 100,
        playerName: 'Test Player'
      }));
    });

    it('should handle WebSocket reconnection', async () => {
      // Simulate WebSocket disconnection
      sdk.dispose();
      await sdk.initialize();

      const updateHandler = vi.fn();
      sdk.onLeaderboardUpdate(updateHandler);

      await sdk.submitScore(200, 'Test Player');

      // Wait for WebSocket message
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(updateHandler).toHaveBeenCalledWith(expect.objectContaining({
        score: 200,
        playerName: 'Test Player'
      }));
    });
  });
});
