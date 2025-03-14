import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { LeaderboardManager } from '../leaderboard';
import { LeaderboardEntry, LeaderboardUpdateEvent } from '../types';

describe('LeaderboardManager', () => {
  let leaderboardManager: LeaderboardManager;
  let mockApiClient: any;
  let mockWsClient: any;

  beforeEach(() => {
    // Mock API client
    mockApiClient = {
      post: vi.fn(),
      get: vi.fn()
    };

    // Mock WebSocket client
    mockWsClient = {
      send: vi.fn(),
      onMessage: vi.fn()
    };

    leaderboardManager = new LeaderboardManager(mockApiClient, mockWsClient);
  });

  describe('Score Submission', () => {
    it('should submit scores successfully', async () => {
      const event: LeaderboardUpdateEvent = {
        gameId: 'test-game',
        playerId: 'player-1',
        playerName: 'Test Player',
        score: 100,
        metadata: { level: 5 }
      };

      mockApiClient.post.mockResolvedValue({ success: true });
      await leaderboardManager.submitScore(event);

      expect(mockApiClient.post).toHaveBeenCalledWith('/leaderboard/submit', event);
      expect(mockWsClient.send).toHaveBeenCalledWith({
        type: 'leaderboard_update',
        data: event
      });
    });

    it('should handle submission errors', async () => {
      const event: LeaderboardUpdateEvent = {
        gameId: 'test-game',
        playerId: 'player-1',
        playerName: 'Test Player',
        score: 100
      };

      mockApiClient.post.mockRejectedValue(new Error('Network error'));
      await expect(leaderboardManager.submitScore(event)).rejects.toThrow('Network error');
    });
  });

  describe('Leaderboard Retrieval', () => {
    const mockLeaderboard: LeaderboardEntry[] = [
      {
        playerId: 'player-1',
        playerName: 'Top Player',
        score: 1000,
        rank: 1,
        timestamp: new Date().toISOString()
      },
      {
        playerId: 'player-2',
        playerName: 'Second Place',
        score: 900,
        rank: 2,
        timestamp: new Date().toISOString()
      }
    ];

    it('should retrieve leaderboard with default options', async () => {
      mockApiClient.get.mockResolvedValue(mockLeaderboard);
      const result = await leaderboardManager.getLeaderboard('test-game');

      expect(mockApiClient.get).toHaveBeenCalledWith('/leaderboard?gameId=test-game&timeframe=all&limit=10&offset=0');
      expect(result).toEqual(mockLeaderboard);
    });

    it('should retrieve leaderboard with custom options', async () => {
      mockApiClient.get.mockResolvedValue(mockLeaderboard);
      const result = await leaderboardManager.getLeaderboard('test-game', {
        timeframe: 'weekly',
        limit: 5,
        offset: 10,
        filters: { level: 5 }
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/leaderboard?gameId=test-game&timeframe=weekly&limit=5&offset=10&level=5');
      expect(result).toEqual(mockLeaderboard);
    });

    it('should get player rank', async () => {
      const mockRank: LeaderboardEntry = {
        playerId: 'player-1',
        playerName: 'Test Player',
        score: 100,
        rank: 42,
        timestamp: new Date().toISOString()
      };

      mockApiClient.get.mockResolvedValue(mockRank);
      const result = await leaderboardManager.getPlayerRank('test-game', 'player-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/leaderboard/test-game/player/player-1');
      expect(result).toEqual(mockRank);
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to updates', () => {
      const mockCallback = vi.fn();
      leaderboardManager.subscribeToUpdates('test-game', mockCallback);

      expect(mockWsClient.onMessage).toHaveBeenCalled();

      // Simulate receiving a message
      const handler = mockWsClient.onMessage.mock.calls[0][0];
      const mockUpdate = {
        type: 'leaderboard_update',
        data: {
          gameId: 'test-game',
          playerId: 'player-1',
          playerName: 'Test Player',
          score: 100
        }
      };

      handler(mockUpdate);
      expect(mockCallback).toHaveBeenCalledWith(mockUpdate.data);
    });

    it('should ignore updates for other games', () => {
      const mockCallback = vi.fn();
      leaderboardManager.subscribeToUpdates('test-game', mockCallback);

      const handler = mockWsClient.onMessage.mock.calls[0][0];
      const mockUpdate = {
        type: 'leaderboard_update',
        data: {
          gameId: 'other-game',
          playerId: 'player-1',
          playerName: 'Test Player',
          score: 100
        }
      };

      handler(mockUpdate);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should unsubscribe from updates', () => {
      leaderboardManager.unsubscribeFromUpdates();
      expect(mockWsClient.onMessage).toHaveBeenCalledWith(null);
    });
  });
});
