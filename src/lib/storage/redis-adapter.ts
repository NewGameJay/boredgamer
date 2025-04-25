import { Redis } from 'ioredis';
import { StorageAdapter, ScoreEntry, QueryOptions } from './types';


export class RedisStorageAdapter implements StorageAdapter {
  private redis: Redis;
  private readonly SCORE_PREFIX = 'score:';
  private readonly LEADERBOARD_PREFIX = 'leaderboard:';

  constructor(config: { host: string; port: number; password?: string }) {
    this.redis = new Redis(config);
  }

  private getScoreKey(gameId: string, scoreId: string): string {
    return `${this.SCORE_PREFIX}${gameId}:${scoreId}`;
  }

  private getLeaderboardKey(gameId: string, category: string): string {
    return `${this.LEADERBOARD_PREFIX}${gameId}:${category}`;
  }

  async saveScore(gameId: string, score: ScoreEntry): Promise<void> {
    const multi = this.redis.multi();

    // Store the full score data
    const scoreKey = this.getScoreKey(gameId, score.id);
    multi.hmset(scoreKey, {
      ...score,
      metadata: JSON.stringify(score.metadata),
      timestamp: score.timestamp.toISOString()
    });

    // Add to sorted set for leaderboard
    const leaderboardKey = this.getLeaderboardKey(gameId, score.category);
    multi.zadd(leaderboardKey, score.score, score.id);

    // Execute transaction
    await multi.exec();
  }

  async getScores(gameId: string, options: QueryOptions): Promise<ScoreEntry[]> {
    const { category = 'default', limit = 10, offset = 0, sortOrder = 'desc' } = options;
    const leaderboardKey = this.getLeaderboardKey(gameId, category);

    // Get score IDs from sorted set
    const scoreIds = sortOrder === 'desc'
      ? await this.redis.zrevrange(leaderboardKey, offset, offset + limit - 1)
      : await this.redis.zrange(leaderboardKey, offset, offset + limit - 1);

    if (scoreIds.length === 0) return [];

    // Get full score data for each ID
    const multi = this.redis.multi();
    scoreIds.forEach(id => {
      const scoreKey = this.getScoreKey(gameId, id);
      multi.hgetall(scoreKey);
    });

    const results = await multi.exec();
    if (!results) return [];

    return results
      .map(([err, data]) => {
        if (err || !data) return null;
        const typedData = data as { id: string; gameId: string; playerId: string; playerName: string; metadata: string; timestamp: string; score: string; verified: string; category: string };
        const parsedData: ScoreEntry = {
          id: typedData.id,
          gameId: typedData.gameId,
          playerId: typedData.playerId,
          playerName: typedData.playerName,
          metadata: typedData.metadata ? JSON.parse(typedData.metadata) : {},
          timestamp: new Date(typedData.timestamp),
          score: Number(typedData.score),
          verified: typedData.verified === 'true',
          category: typedData.category
        };
        return parsedData;
      })
      .filter((score): score is ScoreEntry => score !== null);
  }

  async deleteScore(gameId: string, scoreId: string): Promise<void> {
    const scoreKey = this.getScoreKey(gameId, scoreId);
    const score = await this.redis.hgetall(scoreKey);
    
    if (!score) return;

    const multi = this.redis.multi();
    
    // Remove from score storage
    multi.del(scoreKey);
    
    // Remove from leaderboard
    const leaderboardKey = this.getLeaderboardKey(gameId, score.category);
    multi.zrem(leaderboardKey, scoreId);

    await multi.exec();
  }

  async batchSaveScores(gameId: string, scores: ScoreEntry[]): Promise<void> {
    const multi = this.redis.multi();

    scores.forEach(score => {
      const scoreKey = this.getScoreKey(gameId, score.id);
      multi.hmset(scoreKey, {
        ...score,
        metadata: JSON.stringify(score.metadata),
        timestamp: score.timestamp.toISOString()
      });

      const leaderboardKey = this.getLeaderboardKey(gameId, score.category);
      multi.zadd(leaderboardKey, score.score, score.id);
    });

    await multi.exec();
  }

  async cleanup(gameId: string, olderThan: Date): Promise<void> {
    // Get all score keys for the game
    const cursor = '0';
    const pattern = this.getScoreKey(gameId, '*');
    
    const scan = async (cursor: string): Promise<void> => {
      const [newCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      
      if (keys.length > 0) {
        const multi = this.redis.multi();
        
        // Check each score's timestamp
        for (const key of keys) {
          const score = await this.redis.hgetall(key);
          if (new Date(score.timestamp) < olderThan) {
            multi.del(key);
            if (score.category) {
              const leaderboardKey = this.getLeaderboardKey(gameId, score.category);
              multi.zrem(leaderboardKey, score.id);
            }
          }
        }
        
        await multi.exec();
      }
      
      if (newCursor !== '0') {
        await scan(newCursor);
      }
    };

    await scan(cursor);
  }
}
