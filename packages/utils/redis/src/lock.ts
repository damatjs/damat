/**
 * Redis Module - Distributed Locks
 *
 * Functions for acquiring and releasing distributed locks using Redis.
 */

import type { Redis } from "./types";

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
  client: Redis,
  key: string,
  ttlMs: number = 10000,
): Promise<string | null> {
  const lockValue = `${Date.now()}:${Math.random()}`;
  const result = await client.set(
    LOCK_PREFIX + key,
    lockValue,
    "PX",
    ttlMs,
    "NX",
  );
  return result === "OK" ? lockValue : null;
}

/**
 * Release a distributed lock.
 *
 * @param client - Redis client instance
 * @param key - Lock key
 * @param lockValue - Lock value returned from acquireLock
 * @returns true if lock was released, false if lock was not held or expired
 */
export async function releaseLock(
  client: Redis,
  key: string,
  lockValue: string,
): Promise<boolean> {
  // Use Lua script for atomic check-and-delete
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const result = await client.eval(script, 1, LOCK_PREFIX + key, lockValue);
  return result === 1;
}

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
  client: Redis,
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 10000,
): Promise<T> {
  const lockValue = await acquireLock(client, key, ttlMs);
  if (!lockValue) {
    throw new Error(`Could not acquire lock: ${key}`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(client, key, lockValue);
  }
}
