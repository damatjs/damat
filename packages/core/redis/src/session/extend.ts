import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { SESSION_PREFIX } from "./constant";

export async function extendSession(
  token: string,
  ttlSeconds: number,
  client?: Redis,
): Promise<boolean> {
  const redis = client || getRedis();
  const result = await redis.expire(SESSION_PREFIX + token, ttlSeconds);
  return result === 1;
}
