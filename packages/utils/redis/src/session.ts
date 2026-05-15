import type { Redis } from "./types";
import { getRedis } from "./client";

const SESSION_PREFIX = "session:";

export async function getSession<T>(
  token: string,
  client?: Redis,
): Promise<T | null> {
  const redis = client || getRedis();
  const value = await redis.get(SESSION_PREFIX + token);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setSession<T>(
  token: string,
  data: T,
  ttlSeconds: number,
  client?: Redis,
): Promise<void> {
  const redis = client || getRedis();
  await redis.setex(SESSION_PREFIX + token, ttlSeconds, JSON.stringify(data));
}

export async function deleteSession(
  token: string,
  client?: Redis,
): Promise<void> {
  const redis = client || getRedis();
  await redis.del(SESSION_PREFIX + token);
}

export async function extendSession(
  token: string,
  ttlSeconds: number,
  client?: Redis,
): Promise<boolean> {
  const redis = client || getRedis();
  const result = await redis.expire(SESSION_PREFIX + token, ttlSeconds);
  return result === 1;
}
