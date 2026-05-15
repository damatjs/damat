/**
 * Redis Module - Rate Limiting
 *
 * Sliding window rate limiting using Redis sorted sets.
 */

import type {
  Redis,
  RateLimitResult,
  RateLimitWindow,
  MultiRateLimitResult,
} from "./types";

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
  client: Redis,
  identifier: string,
  windowMs: number,
  maxRequests: number,
): Promise<RateLimitResult> {
  const key = RATE_LIMIT_PREFIX + identifier;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Use a transaction for atomic operations
  const pipeline = client.pipeline();

  // Remove old entries outside the window
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Count current requests in window
  pipeline.zcard(key);

  // Add current request
  pipeline.zadd(key, now, `${now}:${Math.random()}`);

  // Set expiry on the key
  pipeline.pexpire(key, windowMs);

  const results = await pipeline.exec();

  // Get the count before adding (results[1] is the zcard result)
  const currentCount = (results?.[1]?.[1] as number) || 0;

  const allowed = currentCount < maxRequests;
  const remaining = Math.max(0, maxRequests - currentCount - 1);
  const resetAt = now + windowMs;

  if (!allowed) {
    // Calculate when the oldest request will expire
    const oldest = await client.zrange(key, 0, 0, "WITHSCORES");
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
  client: Redis,
  identifier: string,
  limits: RateLimitWindow[],
): Promise<MultiRateLimitResult> {
  for (const limit of limits) {
    const windowName =
      limit.windowMs >= 86400000
        ? "day"
        : limit.windowMs >= 3600000
          ? "hour"
          : "minute";

    const result = await checkRateLimit(
      client,
      `${identifier}:${windowName}`,
      limit.windowMs,
      limit.maxRequests,
    );

    if (!result.allowed) {
      return { ...result, limitedBy: windowName };
    }
  }

  return { allowed: true, remaining: -1, resetAt: Date.now() };
}
