import type { Redis } from "../types";
import { getRedis } from "../singleton";
import { SESSION_PREFIX } from "./constant";

export async function deleteSession(
  token: string,
  client?: Redis,
): Promise<void> {
  const redis = client || getRedis();
  await redis.del(SESSION_PREFIX + token);
}
