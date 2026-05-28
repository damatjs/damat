import type { Redis, RateLimitResult } from "../types";
import { getRedis } from "../singleton";
import { RATE_LIMIT_PREFIX } from "./constant";

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
