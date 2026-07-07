import type { RetryPolicy } from "./retry";

/**
 * Step configuration options
 */
export interface StepConfig {
  /** Step timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Retry policy (default: no retries) */
  retry?: Partial<RetryPolicy>;
  /**
   * Whether this step is idempotent (safe to retry). When false, the retry
   * policy is ignored: the first failure goes straight to the workflow
   * failure/compensation path instead of re-invoking the step.
   * Default: true
   */
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
