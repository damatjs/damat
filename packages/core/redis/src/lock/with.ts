import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { acquireLock } from "./acquire";
import { releaseLock } from "./release";

/**
 * Execute a function with a distributed lock.
 *
 * @param client - Redis client instance
 * @param key - Lock key
 * @param fn - Function to execute while holding the lock
 * @param ttlMs - Lock TTL in milliseconds (default: 10000)
 * @returns Result of the function
 * @throws Error if lock cannot be acquired
 *
 * @example
 * ```typescript
 * const result = await withLock(redis, 'process-order:123', async () => {
 *   // Do work that requires exclusive access...
 *   return processOrder(123);
 * });
 * ```
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 10000,
  client?: Redis,
): Promise<T> {
  const redis = client || getRedis();
  const lockValue = await acquireLock(key, ttlMs, redis);
  if (!lockValue) {
    throw new Error(`Could not acquire lock: ${key}`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key, lockValue, redis);
  }
}
