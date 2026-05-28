import type { RetryPolicy } from "../../types";

// =============================================================================
// RETRY POLICY PRESETS
// =============================================================================

/**
 * Pre-configured retry policies for common use cases
 */
export const RetryPolicies = {
  /**
   * No retries - fail immediately on first error
   */
  none: {
    maxAttempts: 0,
  } as Partial<RetryPolicy>,

  /**
   * Retry once immediately - for transient failures
   */
  once: {
    maxAttempts: 1,
    initialDelayMs: 0,
  } as Partial<RetryPolicy>,

  /**
   * Standard retry with exponential backoff
   * Good for most API calls and database operations
   */
  standard: {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  } as Partial<RetryPolicy>,

  /**
   * Aggressive retry for critical operations
   * More attempts with longer max delay
   */
  aggressive: {
    maxAttempts: 5,
    initialDelayMs: 50,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  } as Partial<RetryPolicy>,

  /**
   * Patient retry for rate-limited APIs
   * Longer delays between attempts
   */
  patient: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 3,
  } as Partial<RetryPolicy>,
} as const;

/**
 * Type for retry policy preset names
 */
export type RetryPolicyPreset = keyof typeof RetryPolicies;
