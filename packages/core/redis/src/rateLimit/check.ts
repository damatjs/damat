import type { Redis, RateLimitResult } from "../types";
import { getRedis } from "../singleton";
import { RATE_LIMIT_PREFIX } from "./constant";
import { RATE_LIMIT_SCRIPT } from "./script";

export async function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number,
  client?: Redis,
): Promise<RateLimitResult> {
  const redis = client || getRedis();
  const key = RATE_LIMIT_PREFIX + identifier;
  const now = Date.now();

  const [allowed, currentCount, oldestScore] = (await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    key,
    now - windowMs,
    maxRequests,
    now,
    `${now}:${Math.random()}`,
    windowMs,
  )) as [number, number, string?];

  const resetAt = now + windowMs;

  if (allowed !== 1) {
    const oldestTimestamp = oldestScore ? parseInt(oldestScore, 10) : now;
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetAt, retryAfter };
  }

  const remaining = Math.max(0, maxRequests - currentCount - 1);
  return { allowed: true, remaining, resetAt };
}
