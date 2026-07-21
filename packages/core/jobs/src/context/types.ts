import type {
  RedactionOptions,
  WorkLogLevel,
  WorkLogLimits,
  withIdempotency,
} from "@damatjs/durability";

export interface JobRunContext {
  runId: string;
  attempt: number;
  maxAttempts: number;
  queue: string;
  metadata: Record<string, unknown>;
  signal: AbortSignal;
  progress(
    value: number | Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
  log(
    level: WorkLogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<void>;
  withIdempotency: typeof withIdempotency;
}

export interface JobContextOptions {
  progressMinimumIntervalMs?: number;
  logLimits?: WorkLogLimits;
  redaction?: RedactionOptions;
}
