import type { Redis, RateLimitResult, MultiRateLimitResult } from "./types";
import { getRedis } from "./client";

const RATE_LIMIT_PREFIX = "ratelimit:";

/**
 * Check and increment rate limit using sliding window algorithm.
 *
 * @param client - Redis client instance
 * @param identifier - Unique identifier for the rate limit (e.g., user ID, IP)
 * @param windowMs - Window duration in milliseconds
 * @param maxRequests - Maximum requests allowed in the window
 * @returns Rate limit result with allowed status and remaining count
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(redis, `user:${userId}`, 60000, 100);
 * if (!result.allowed) {
 *   throw new Error(`Rate limited. Retry after ${result.retryAfter} seconds`);
 * }
 * ```
 */
export async function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number,
  client?: Redis,
): Promise<RateLimitResult> {
  const redis = client || getRedis();
  const key = RATE_LIMIT_PREFIX + identifier;
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zcard(key);
  pipeline.zadd(key, now, `${now}:${Math.random()}`);
  pipeline.pexpire(key, windowMs);

  const results = await pipeline.exec();
  const currentCount = (results?.[1]?.[1] as number) || 0;

  const allowed = currentCount < maxRequests;
  const remaining = Math.max(0, maxRequests - currentCount - 1);
  const resetAt = now + windowMs;

  if (!allowed) {
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    const oldestTimestamp = oldest[1] ? parseInt(oldest[1], 10) : now;
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetAt, retryAfter };
  }

  return { allowed: true, remaining, resetAt };
}

/**
 * Check rate limits across multiple windows (e.g., per minute AND per hour).
 *
 * @param client - Redis client instance
 * @param identifier - Unique identifier for the rate limit
 * @param limits - Array of rate limit windows to check
 * @returns Rate limit result with which window triggered the limit
 *
 * @example
 * ```typescript
 * const result = await checkMultiRateLimit(redis, `user:${userId}`, [
 *   { windowMs: 60000, maxRequests: 60 },     // 60 per minute
 *   { windowMs: 3600000, maxRequests: 1000 }, // 1000 per hour
 * ]);
 * if (!result.allowed) {
 *   console.log(`Limited by ${result.limitedBy} window`);
 * }
 * ```
 */
export async function checkMultiRateLimit(
  identifier: string,
  windows: Array<{ windowMs: number; maxRequests: number }>,
  client?: Redis,
): Promise<MultiRateLimitResult> {
  const redis = client || getRedis();
  for (const window of windows) {
    const windowName =
      window.windowMs >= 86400000
        ? "day"
        : window.windowMs >= 3600000
          ? "hour"
          : "minute";

    const result = await checkRateLimit(
      `${identifier}:${windowName}`,
      window.windowMs,
      window.maxRequests,
      redis,
    );

    if (!result.allowed) {
      return { ...result, limitedBy: windowName };
    }
  }

  return { allowed: true, remaining: -1, resetAt: Date.now() };
}
