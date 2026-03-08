/**
 * External API Service - Default Configurations
 */

import type { ApiRetryPolicy, CircuitBreakerConfig } from "./types";

// =============================================================================
// DEFAULT RETRY POLICY
// =============================================================================

export const DEFAULT_RETRY_POLICY: ApiRetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  isRetryable: (error: unknown) => {
    // Default: retry on network errors and 5xx status codes
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("econnrefused") ||
        message.includes("enotfound")
      ) {
        return true;
      }
    }
    // Check for HTTP status codes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status ?? (error as any)?.statusCode;
    if (typeof status === "number") {
      return status >= 500 || status === 429;
    }
    return false;
  },
};

// =============================================================================
// DEFAULT CIRCUIT BREAKER
// =============================================================================

export const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  successThreshold: 2,
};
