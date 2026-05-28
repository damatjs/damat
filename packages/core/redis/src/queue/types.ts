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
