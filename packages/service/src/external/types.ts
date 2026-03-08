/**
 * External API Service - Type Definitions
 */

import type { ILogger } from "@damatjs/utils";

// =============================================================================
// RETRY POLICY
// =============================================================================

/**
 * Retry policy configuration
 */
export interface ApiRetryPolicy {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number;
  /** Initial delay between retries in ms (default: 100) */
  initialDelayMs: number;
  /** Maximum delay between retries in ms (default: 5000) */
  maxDelayMs: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier: number;
  /** Predicate to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting to close circuit (default: 30000) */
  resetTimeoutMs: number;
  /** Number of successful calls to close circuit (default: 2) */
  successThreshold: number;
}

/**
 * Circuit breaker state
 */
export type CircuitState = "closed" | "open" | "half-open";

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

/**
 * External API service configuration
 */
export interface ExternalApiConfig<TClientConfig> {
  /** Service name for logging */
  serviceName: string;
  /** Client configuration */
  clientConfig: TClientConfig;
  /** Retry policy */
  retry?: Partial<ApiRetryPolicy>;
  /** Circuit breaker config */
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** Logger instance (required) */
  logger: ILogger;
}

/**
 * API call options
 */
export interface ApiCallOptions {
  /** Override default timeout */
  timeoutMs?: number;
  /** Skip retry for this call */
  skipRetry?: boolean;
  /** Skip circuit breaker for this call */
  skipCircuitBreaker?: boolean;
}

// =============================================================================
// HTTP API CONFIGURATION
// =============================================================================

/**
 * HTTP-based external API service config
 */
export interface HttpApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  auth?: {
    type: "bearer" | "basic" | "api-key";
    token?: string;
    username?: string;
    password?: string;
    headerName?: string;
  };
}
