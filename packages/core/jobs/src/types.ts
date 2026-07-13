import type { QueueJob } from "@damatjs/redis";

/**
 * The app-wide job map. Empty by design — apps and modules add their jobs via
 * declaration merging, and `enqueueJob`/`defineJob` become fully typed:
 *
 * ```ts
 * declare module "@damatjs/jobs" {
 *   interface JobMap {
 *     "send-welcome-email": { userId: string };
 *   }
 * }
 * ```
 *
 * Unregistered job names still work (payload typed `unknown`).
 */
export interface JobMap {}

export type JobName = (keyof JobMap & string) | (string & {});

export type JobPayload<K extends string> = K extends keyof JobMap
  ? JobMap[K]
  : unknown;

/** What travels through the queue: which job to run, with what payload. */
export interface JobEnvelope {
  job: string;
  payload: unknown;
}

export type JobHandler<T = unknown> = (
  payload: T,
  job: QueueJob<JobEnvelope>,
) => void | Promise<void>;

export interface JobOptions {
  /** Total executions before dead-lettering (default 3). */
  maxAttempts?: number;
  /** Delay before the first retry, in ms (default 1000). */
  backoffMs?: number;
  /** Multiplier applied per retry (default 2 — 1s, 2s, 4s, …). */
  backoffMultiplier?: number;
  /** Queue priority (default "normal"). */
  priority?: QueueJob["priority"];
}

export interface JobDefinition<T = unknown> {
  name: string;
  handler: JobHandler<T>;
  options: Required<JobOptions>;
}

export const DEFAULT_JOB_OPTIONS: Required<JobOptions> = {
  maxAttempts: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
  priority: "normal",
};

/** The queue every job rides unless overridden. */
export const DEFAULT_JOB_QUEUE = "damat-jobs";
