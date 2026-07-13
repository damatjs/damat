import type { RetryPolicy } from "../../types";

/**
 * Default retry policy - no retries
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 0,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};
