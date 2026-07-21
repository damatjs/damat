import type { ResolvedJobOptions } from "./types";

export const DEFAULT_JOB_QUEUE = "damat-jobs";

export const DEFAULT_JOB_OPTIONS: ResolvedJobOptions = {
  queue: DEFAULT_JOB_QUEUE,
  priority: 100,
  maxAttempts: 3,
  backoffMs: 1_000,
  backoffMultiplier: 2,
};
