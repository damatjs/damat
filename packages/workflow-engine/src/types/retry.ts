/**
 * Retry policy configuration for steps
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts (0 = no retries) */
  maxAttempts: number;
  /** Initial delay between retries in milliseconds */
  initialDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier (e.g., 2 for exponential backoff) */
  backoffMultiplier: number;
  /** Optional predicate to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}
