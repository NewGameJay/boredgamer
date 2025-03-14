import { RedisStorageAdapter } from './redis-adapter';
import { PostgresStorageAdapter } from './postgres-adapter';
import { StorageAdapter, ScoreEntry, QueryOptions } from './types';
import { TIER_LIMITS, SubscriptionTier } from '@/types/subscription';

export class HybridStorageManager implements StorageAdapter {
  constructor(
    private redis: RedisStorageAdapter,
    private postgres: PostgresStorageAdapter,
    private tier: SubscriptionTier
  ) {}

  async saveScore(gameId: string, score: ScoreEntry): Promise<void> {
    // Always save to Redis for real-time leaderboards
    await this.redis.saveScore(gameId, score);

    // Also save to Postgres for historical data
    await this.postgres.saveScore(gameId, score);
  }

  async getScores(gameId: string, options: QueryOptions): Promise<ScoreEntry[]> {
    const { startDate } = options;
    const now = new Date();
    const retentionDays = TIER_LIMITS[this.tier].retentionDays;
    const retentionDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));

    // If requesting recent data (last 24 hours), get from Redis
    if (!startDate || startDate.getTime() > now.getTime() - (24 * 60 * 60 * 1000)) {
      try {
        const redisScores = await this.redis.getScores(gameId, options);
        if (redisScores.length > 0) {
          return redisScores;
        }
      } catch (error) {
        console.error('Redis error, falling back to Postgres:', error);
      }
    }

    // For older data or if Redis fails, get from Postgres
    return this.postgres.getScores(gameId, {
      ...options,
      startDate: startDate || retentionDate // Don't return data older than retention period
    });
  }

  async deleteScore(gameId: string, scoreId: string): Promise<void> {
    // Delete from both storages
    await Promise.all([
      this.redis.deleteScore(gameId, scoreId),
      this.postgres.deleteScore(gameId, scoreId)
    ]);
  }

  async batchSaveScores(gameId: string, scores: ScoreEntry[]): Promise<void> {
    // Save to both storages
    await Promise.all([
      this.redis.batchSaveScores(gameId, scores),
      this.postgres.batchSaveScores(gameId, scores)
    ]);
  }

  async cleanup(gameId: string, olderThan: Date): Promise<void> {
    // Clean up both storages
    await Promise.all([
      this.redis.cleanup(gameId, olderThan),
      this.postgres.cleanup(gameId, olderThan)
    ]);
  }

  // Additional utility methods

  async migrateToHistorical(gameId: string): Promise<void> {
    // Move data older than 24 hours from Redis to Postgres
    const yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const oldScores = await this.redis.getScores(gameId, {
      endDate: yesterday,
      limit: 1000 // Process in batches
    });

    if (oldScores.length > 0) {
      await this.postgres.batchSaveScores(gameId, oldScores);
      await this.redis.cleanup(gameId, yesterday);
    }
  }

  async enforceRetention(gameId: string): Promise<void> {
    const now = new Date();
    const retentionDays = TIER_LIMITS[this.tier].retentionDays;
    const cutoffDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));

    await this.cleanup(gameId, cutoffDate);
  }
}
