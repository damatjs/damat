/**
 * Queue Service - Default Configurations
 */

import type { JobPriority, ResolvedQueueConfig } from "./types";

// =============================================================================
// DEFAULT QUEUE CONFIG
// =============================================================================

/**
 * Default configuration values for queue service
 */
export const DEFAULT_QUEUE_CONFIG: Omit<
  ResolvedQueueConfig,
  "queueName" | "logger"
> = {
  concurrency: 1,
  retryAttempts: 3,
  retryDelayMs: 1000,
  jobTimeoutMs: 30000,
  useRedis: process.env.NODE_ENV === "production",
  pollIntervalMs: 1000,
  redisClient: null,
};

// =============================================================================
// PRIORITY SCORES
// =============================================================================

/**
 * Priority scores for job ordering
 * Higher score = higher priority
 */
export const PRIORITY_SCORES: Record<JobPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};
