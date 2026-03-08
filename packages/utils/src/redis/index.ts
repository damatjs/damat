/**
 * Redis Module
 *
 * Redis client utilities for caching, rate limiting, sessions,
 * distributed locks, and atomic counters.
 *
 * @example
 * ```typescript
 * import { createRedis, cacheGet, cacheSet } from '@damatjs/utils';
 *
 * const redis = createRedis({
 *   url: process.env.REDIS_URL || 'redis://localhost:6379',
 * });
 *
 * await cacheSet(redis, 'user:123', { name: 'John' }, 3600);
 * const user = await cacheGet(redis, 'user:123');
 * ```
 */

// Types
export type {
  RedisConfig,
  RateLimitResult,
  RateLimitWindow,
  MultiRateLimitResult,
  Redis,
} from "./types";

// Client
export { createRedis, disconnect } from "./client";

// Cache
export {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetRaw,
  cacheSetRaw,
} from "./cache";

// Rate Limiting
export { checkRateLimit, checkMultiRateLimit } from "./rateLimit";

// Session
export {
  getSession,
  setSession,
  deleteSession,
  extendSession,
} from "./session";

// Distributed Locks
export { acquireLock, releaseLock, withLock } from "./lock";

// Counters
export {
  incrementCounter,
  decrementCounter,
  getCounter,
  resetCounter,
  setCounter,
} from "./counter";
