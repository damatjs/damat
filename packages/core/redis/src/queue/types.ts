/**
 * Redis Module - Job Queue
 *
 * Redis-backed job queue for production use.
 */

export interface QueueJob<TData = unknown> {
  id: string;
  queue: string;
  data: TData;
  status: "pending" | "processing" | "completed" | "failed" | "retrying";
  priority: "low" | "normal" | "high" | "critical";
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  delay?: number;
  metadata?: Record<string, unknown>;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface RedisQueueOptions {
  /**
   * When set (> 0), dequeue first moves `:processing` entries claimed more
   * than this many ms ago back to `pending`, so jobs from crashed workers are
   * redelivered (at-least-once). Callers must ack via `updateStatus` before
   * the timeout elapses. Unset keeps the legacy behavior: unacked jobs stay
   * in `:processing` forever.
   */
  visibilityTimeoutMs?: number;

  /**
   * Max entries retained in the `:completed` set. On each completion the oldest
   * entries beyond the cap are trimmed, so the set can't grow forever. Defaults
   * to `DEFAULT_MAX_TERMINAL_ENTRIES`; pass 0 or a negative value to disable
   * trimming (unbounded).
   */
  maxCompletedEntries?: number;

  /**
   * Max entries retained in the `:failed` set. Trimmed like
   * `maxCompletedEntries`; same default and opt-out semantics.
   */
  maxFailedEntries?: number;
}
