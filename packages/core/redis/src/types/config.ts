import type { RedisOptions } from "@damatjs/deps/ioredis";
import { ILogger } from "@damatjs/logger"
// =============================================================================
// REDIS CONFIGURATION
// =============================================================================

/**
 * Configuration for creating a Redis client
 */
export interface RedisConfig {
  /** Redis connection URL (e.g., redis://localhost:6379) */
  url: string;
  /** Maximum retries per request (default: 3) */
  maxRetriesPerRequest?: number;
  /** Whether to use lazy connect (default: true) */
  lazyConnect?: boolean;
  /** Additional Redis options */
  options?: Partial<RedisOptions>;
}

/**
 * Configuration for RedisClient class
 */
export interface RedisClientConfig extends RedisConfig {
  /** Optional logger instance (defaults to global logger) */
  logger?: ILogger;
  /** Connection name for identification */
  name?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export type { RedisOptions } from "@damatjs/deps/ioredis";
