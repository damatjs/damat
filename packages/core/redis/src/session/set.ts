import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { SESSION_PREFIX } from "./constant";

export async function setSession<T>(
  token: string,
  data: T,
  ttlSeconds: number,
  client?: Redis,
): Promise<void> {
  const redis = client || getRedis();
  await redis.setex(SESSION_PREFIX + token, ttlSeconds, JSON.stringify(data));
}
