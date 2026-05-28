import type { Redis } from "../types";
import { getRedis } from "../singleton";

const LOCK_PREFIX = "lock:";

/**
 * Acquire a distributed lock.
 *
 * @param client - Redis client instance
 * @param key - Lock key
 * @param ttlMs - Lock TTL in milliseconds (default: 10000)
 * @returns Lock value if acquired, null if lock is held by another process
 *
 * @example
 * ```typescript
 * const lockValue = await acquireLock(redis, 'process-order:123', 30000);
 * if (!lockValue) {
 *   throw new Error('Could not acquire lock');
 * }
 * try {
 *   // Do work...
 * } finally {
 *   await releaseLock(redis, 'process-order:123', lockValue);
 * }
 * ```
 */
export async function acquireLock(
  key: string,
  ttlMs: number = 10000,
  client?: Redis,
): Promise<string | null> {
  const redis = client || getRedis();
  const lockValue = `${Date.now()}:${Math.random()}`;
  const result = await redis.set(
    LOCK_PREFIX + key,
    lockValue,
    "PX",
    ttlMs,
    "NX",
  );
  return result === "OK" ? lockValue : null;
}
