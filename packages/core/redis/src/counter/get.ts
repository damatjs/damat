import type { Redis } from "../types";
import { getRedis } from "../singleton";

export async function getCounter(key: string, client?: Redis): Promise<number> {
  const redis = client || getRedis();
  const value = await redis.get(key);
  return value ? parseInt(value, 10) : 0;
}
