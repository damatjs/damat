import type { RetryPolicy } from "./retry";

/**
 * Step configuration options
 */
export interface StepConfig {
  /** Step timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Retry policy (default: no retries) */
  retry?: Partial<RetryPolicy>;
  /** Whether this step is idempotent (safe to retry) */
  idempotent?: boolean;
  /** Custom description for logging */
  description?: string;
}

/**
 * Required step configuration (with defaults applied)
 */
export interface RequiredStepConfig {
  timeoutMs: number;
  retry: RetryPolicy;
  idempotent: boolean;
  description: string;
}
