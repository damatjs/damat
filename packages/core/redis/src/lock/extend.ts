import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { LOCK_PREFIX } from "./constants";

/**
 * Extend a distributed lock's TTL.
 * Only succeeds if the lock is still held with the given lock value.
 *
 * @param key - Lock key
 * @param lockValue - Lock value returned from acquireLock
 * @param ttlMs - New TTL in milliseconds
 * @returns true if extended, false if lock was not held or expired
 */
export async function extendLock(
  key: string,
  lockValue: string,
  ttlMs: number,
  client?: Redis,
): Promise<boolean> {
  const redis = client || getRedis();
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  const result = await redis.eval(
    script,
    1,
    LOCK_PREFIX + key,
    lockValue,
    ttlMs.toString(),
  );
  return result === 1;
}
