import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { LOCK_PREFIX } from "./constants";

/**
 * Check whether a distributed lock is currently held.
 *
 * @param key - Lock key
 * @returns true if the lock is held
 */
export async function isLocked(key: string, client?: Redis): Promise<boolean> {
  const redis = client || getRedis();
  const value = await redis.get(LOCK_PREFIX + key);
  return value !== null;
}
