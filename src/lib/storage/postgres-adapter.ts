import { Pool } from 'pg';
import { StorageAdapter, ScoreEntry, QueryOptions } from './types';

export class PostgresStorageAdapter implements StorageAdapter {
  private pool: Pool;

  constructor(config: { connectionString: string }) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: process.env.NODE_ENV === 'production'
    });
  }

  async initialize(): Promise<void> {
    // Create tables if they don't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        score NUMERIC NOT NULL,
        category TEXT NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_scores_game_timestamp 
        ON scores(game_id, timestamp);
      
      CREATE INDEX IF NOT EXISTS idx_scores_category 
        ON scores(game_id, category, score);
    `);
  }

  async saveScore(gameId: string, score: ScoreEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO scores (
        id, game_id, player_id, player_name, score, 
        category, metadata, timestamp, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        score = EXCLUDED.score,
        metadata = EXCLUDED.metadata,
        verified = EXCLUDED.verified`,
      [
        score.id,
        gameId,
        score.playerId,
        score.playerName,
        score.score,
        score.category,
        score.metadata,
        score.timestamp,
        score.verified
      ]
    );
  }

  async getScores(gameId: string, options: QueryOptions): Promise<ScoreEntry[]> {
    const {
      category = 'default',
      limit = 10,
      offset = 0,
      startDate,
      endDate,
      sortOrder = 'desc',
      filters = {}
    } = options;

    let query = `
      SELECT * FROM scores 
      WHERE game_id = $1 
      AND category = $2
    `;
    const params: any[] = [gameId, category];
    let paramCount = 2;

    if (startDate) {
      query += ` AND timestamp >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= $${++paramCount}`;
      params.push(endDate);
    }

    // Add custom filters
    Object.entries(filters).forEach(([key, value]) => {
      query += ` AND metadata->>'${key}' = $${++paramCount}`;
      params.push(value);
    });

    query += ` ORDER BY score ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      gameId: row.game_id,
      playerId: row.player_id,
      playerName: row.player_name,
      score: Number(row.score),
      category: row.category,
      metadata: row.metadata,
      timestamp: new Date(row.timestamp),
      verified: row.verified
    }));
  }

  async deleteScore(gameId: string, scoreId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM scores WHERE game_id = $1 AND id = $2',
      [gameId, scoreId]
    );
  }

  async batchSaveScores(gameId: string, scores: ScoreEntry[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const score of scores) {
        await client.query(
          `INSERT INTO scores (
            id, game_id, player_id, player_name, score,
            category, metadata, timestamp, verified
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            score = EXCLUDED.score,
            metadata = EXCLUDED.metadata,
            verified = EXCLUDED.verified`,
          [
            score.id,
            gameId,
            score.playerId,
            score.playerName,
            score.score,
            score.category,
            score.metadata,
            score.timestamp,
            score.verified
          ]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async cleanup(gameId: string, olderThan: Date): Promise<void> {
    await this.pool.query(
      'DELETE FROM scores WHERE game_id = $1 AND timestamp < $2',
      [gameId, olderThan]
    );
  }
}
