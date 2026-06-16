import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { LOCK_PREFIX } from "./constants";
import { randomUUID } from "node:crypto";

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
  // Must be unguessable so another process can't release a lock it doesn't own
  const lockValue = randomUUID();
  const result = await redis.set(
    LOCK_PREFIX + key,
    lockValue,
    "PX",
    ttlMs,
    "NX",
  );
  return result === "OK" ? lockValue : null;
}
