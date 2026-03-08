/**
 * External API Service - Error Classes
 */

// =============================================================================
// EXTERNAL API ERROR
// =============================================================================

/**
 * Error thrown when an external API call fails
 */
export class ExternalApiError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly operation: string,
    message: string,
    public readonly cause?: unknown,
    public readonly statusCode?: number,
  ) {
    super(`[${serviceName}] ${operation}: ${message}`);
    this.name = "ExternalApiError";
  }
}

// =============================================================================
// CIRCUIT BREAKER ERROR
// =============================================================================

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(serviceName: string) {
    super(
      `[${serviceName}] Circuit breaker is open - service temporarily unavailable`,
    );
    this.name = "CircuitBreakerOpenError";
  }
}

// =============================================================================
// MAX RETRIES ERROR
// =============================================================================

/**
 * Error thrown when max retries are exhausted
 */
export class MaxRetriesExhaustedError extends Error {
  constructor(
    serviceName: string,
    operation: string,
    attempts: number,
    public readonly lastError: unknown,
  ) {
    super(`[${serviceName}] ${operation} failed after ${attempts} attempts`);
    this.name = "MaxRetriesExhaustedError";
  }
}
