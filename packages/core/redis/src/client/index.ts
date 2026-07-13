import { Redis } from "@damatjs/deps/ioredis";
export { Redis };
import type { RedisConfig } from "../types";
import { createRedisConnection } from "./factory";
export { createRetryStrategy } from "./factory";

export function createRedis(config: RedisConfig): Redis {
  return createRedisConnection(config);
}

export async function disconnect(client: Redis): Promise<void> {
  await client.quit();
}

export * from "./factory";
