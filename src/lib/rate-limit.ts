import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60000 // 1 minute default
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;

  const multi = redis.multi();
  multi.incr(windowKey);
  multi.pttl(windowKey);

  const [count, ttl] = await multi.exec() as [null | Error | number, null | Error | number];

  // Set expiry for new keys
  if (ttl === -1) {
    await redis.pexpire(windowKey, windowMs);
  }

  const currentCount = typeof count === 'number' ? count : 0;
  const resetMs = ttl === -1 ? windowMs : (ttl as number);

  return {
    success: currentCount <= maxRequests,
    remaining: Math.max(0, maxRequests - currentCount),
    reset: Math.floor(now / 1000) + Math.floor(resetMs / 1000)
  };
}
