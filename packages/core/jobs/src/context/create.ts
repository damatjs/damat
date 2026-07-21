import { withIdempotency } from "@damatjs/durability";
import { recordJobLog } from "./log";
import { recordJobProgress } from "./progress";
import type { JobContextOptions, JobRunContext } from "./types";
import type { ClaimedJobRun } from "../worker/types";

const DEFAULT_LIMITS = { maxCount: 1_000, maxBytes: 1_048_576 };

export function createJobRunContext(
  claim: ClaimedJobRun,
  controller: AbortController,
  options: JobContextOptions = {},
): JobRunContext {
  return {
    runId: claim.id,
    attempt: claim.attemptCount,
    maxAttempts: claim.maxAttempts,
    queue: claim.queue,
    metadata: claim.metadata,
    signal: controller.signal,
    progress: (value, metadata) =>
      recordJobProgress(
        claim,
        value,
        metadata,
        options.progressMinimumIntervalMs ?? 1_000,
      ),
    log: (level, message, context = {}) =>
      recordJobLog(
        claim,
        level,
        message,
        context,
        options.logLimits ?? DEFAULT_LIMITS,
        options.redaction ?? {},
      ),
    withIdempotency,
  };
}
