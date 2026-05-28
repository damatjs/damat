import type { Redis } from "../types";
import { getRedis } from "../singleton";

const LOCK_PREFIX = "lock:";

/**
 * Release a distributed lock.
 *
 * @param client - Redis client instance
 * @param key - Lock key
 * @param lockValue - Lock value returned from acquireLock
 * @returns true if lock was released, false if lock was not held or expired
 */
export async function releaseLock(
  key: string,
  lockValue: string,
  client?: Redis,
): Promise<boolean> {
  const redis = client || getRedis();
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const result = await redis.eval(script, 1, LOCK_PREFIX + key, lockValue);
  return result === 1;
}
