import { Redis } from "@damatjs/deps/ioredis";
import type { RedisConfig } from "../types";

export function createRetryStrategy(times: number): number {
  return Math.min(times * 50, 2000);
}

export function createRedisConnection(config: RedisConfig): Redis {
  return new Redis(config.url, {
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
    retryStrategy: createRetryStrategy,
    lazyConnect: config.lazyConnect ?? true,
    ...config.options,
  });
}
