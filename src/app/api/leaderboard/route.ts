import { NextRequest, NextResponse } from 'next/server';
import { HybridStorageManager } from '@/lib/storage/hybrid-storage';
import { RedisStorageAdapter } from '@/lib/storage/redis-adapter';
import { PostgresStorageAdapter } from '@/lib/storage/postgres-adapter';

import { rateLimit } from '@/lib/rate-limit';

// Initialize storage adapters
const redis = new RedisStorageAdapter({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

const postgres = new PostgresStorageAdapter({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/boredgamer'
});

// POST /api/leaderboard/submit
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    // TODO: Replace with actual API key validation and tier lookup
    const tier = 'independent';
    
    // Check rate limit
    const { success } = await rateLimit(apiKey, 100); // Fixed rate limit for all users
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json();
    const { gameId, playerId, playerName, score, category = 'default', metadata = {} } = body;

    if (!gameId || !playerId || !playerName || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const storage = new HybridStorageManager(redis, postgres);
    
    await storage.saveScore(gameId, {
      id: crypto.randomUUID(),
      gameId,
      playerId,
      playerName,
      score: Number(score),
      category,
      metadata,
      timestamp: new Date(),
      verified: false
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting score:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/leaderboard
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    // TODO: Replace with actual API key validation and tier lookup
    const tier = 'independent';
    
    // Check rate limit
    const { success } = await rateLimit(apiKey, 100); // Replaced TIER_LIMITS[tier].requestsPerMinute with a fixed value
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const url = new URL(req.url);
    const gameId = url.searchParams.get('gameId');
    const category = url.searchParams.get('category') || 'default';
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    const storage = new HybridStorageManager(redis, postgres);
    
    const scores = await storage.getScores(gameId, {
      category,
      limit,
      offset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    return NextResponse.json({ scores });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
