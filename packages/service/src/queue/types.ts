/**
 * Queue Service - Type Definitions
 */

import type { ILogger } from "@damatjs/utils";
import type { Redis } from "@damatjs/deps/ioredis";

// =============================================================================
// JOB TYPES
// =============================================================================

/**
 * Job status
 */
export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retrying";

/**
 * Job priority levels
 */
export type JobPriority = "low" | "normal" | "high" | "critical";

/**
 * Job data structure
 */
export interface Job<TData = unknown> {
  /** Unique job ID */
  id: string;
  /** Queue name */
  queue: string;
  /** Job payload */
  data: TData;
  /** Current status */
  status: JobStatus;
  /** Job priority */
  priority: JobPriority;
  /** Number of attempts made */
  attempts: number;
  /** Maximum attempts allowed */
  maxAttempts: number;
  /** When job was created */
  createdAt: Date;
  /** When job started processing */
  startedAt?: Date;
  /** When job completed */
  completedAt?: Date;
  /** Error message if failed */
  error?: string;
  /** Delay before processing (ms) */
  delay?: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ENQUEUE OPTIONS
// =============================================================================

/**
 * Job options when enqueueing
 */
export interface EnqueueOptions {
  /** Job priority (default: normal) */
  priority?: JobPriority;
  /** Delay before processing in ms */
  delay?: number;
  /** Custom job ID */
  jobId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Override max attempts */
  maxAttempts?: number;
}

// =============================================================================
// QUEUE CONFIGURATION
// =============================================================================

/**
 * Queue configuration
 */
export interface QueueConfig {
  /** Queue name */
  queueName: string;
  /** Number of concurrent job processors (default: 1) */
  concurrency?: number;
  /** Number of retry attempts (default: 3) */
  retryAttempts?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelayMs?: number;
  /** Job timeout in ms (default: 30000) */
  jobTimeoutMs?: number;
  /** Use Redis for persistence (default: true in production) */
  useRedis?: boolean;
  /** Redis client instance (required when useRedis is true) */
  redisClient?: Redis;
  /** Logger instance (required) */
  logger: ILogger;
  /** Poll interval for Redis queue in ms (default: 1000) */
  pollIntervalMs?: number;
}

/**
 * Resolved queue configuration with all defaults applied
 */
export interface ResolvedQueueConfig extends Required<
  Omit<QueueConfig, "redisClient">
> {
  redisClient: Redis | null;
}

// =============================================================================
// QUEUE STATISTICS
// =============================================================================

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}
