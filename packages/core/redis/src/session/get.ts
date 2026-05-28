import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { SESSION_PREFIX } from "./constant";

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
