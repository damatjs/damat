/**
 * External API Service - Base Class
 *
 * Abstract base class for external API integrations with retry logic,
 * circuit breaker pattern, and error handling.
 */

import type { ILogger } from "@damatjs/utils";
import type {
  ApiRetryPolicy,
  CircuitBreakerConfig,
  CircuitState,
  ExternalApiConfig,
  ApiCallOptions,
} from "./types";
import { DEFAULT_RETRY_POLICY, DEFAULT_CIRCUIT_BREAKER } from "./defaults";
import {
  ExternalApiError,
  CircuitBreakerOpenError,
  MaxRetriesExhaustedError,
} from "./errors";

/**
 * Abstract base class for external API integrations
 *
 * @template TClient - The API client type
 * @template TClientConfig - The client configuration type
 */
export abstract class BaseExternalApiService<TClient, TClientConfig = unknown> {
  protected readonly log: ILogger;
  protected readonly retryPolicy: ApiRetryPolicy;
  protected readonly circuitBreakerConfig: CircuitBreakerConfig;
  protected readonly defaultTimeoutMs: number;

  // Client instance (lazy initialized)
  private _client: TClient | null = null;

  // Circuit breaker state
  private circuitState: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(protected readonly config: ExternalApiConfig<TClientConfig>) {
    this.log = config.logger.child({
      service: config.serviceName,
    });
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY, ...config.retry };
    this.circuitBreakerConfig = {
      ...DEFAULT_CIRCUIT_BREAKER,
      ...config.circuitBreaker,
    };
    this.defaultTimeoutMs = config.timeoutMs ?? 30000;
  }

  /**
   * Create the API client instance
   * Must be implemented by subclasses
   */
  protected abstract createClient(config: TClientConfig): TClient;

  /**
   * Get the API client (lazy initialized)
   */
  protected get client(): TClient {
    if (!this._client) {
      this._client = this.createClient(this.config.clientConfig);
    }
    return this._client;
  }

  /**
   * Reset the client (useful for reconnection)
   */
  protected resetClient(): void {
    this._client = null;
  }

  // =========================================================================
  // RETRY LOGIC
  // =========================================================================

  /**
   * Execute an operation with retry logic
   */
  protected async withRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    options: ApiCallOptions = {},
  ): Promise<T> {
    if (options.skipRetry) {
      return this.executeWithCircuitBreaker(operation, fn, options);
    }

    let lastError: unknown;
    let delay = this.retryPolicy.initialDelayMs;

    for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt++) {
      try {
        return await this.executeWithCircuitBreaker(operation, fn, options);
      } catch (error) {
        lastError = error;

        // Don't retry circuit breaker errors
        if (error instanceof CircuitBreakerOpenError) {
          throw error;
        }

        // Check if error is retryable
        const isRetryable = this.retryPolicy.isRetryable?.(error) ?? false;
        if (!isRetryable || attempt === this.retryPolicy.maxAttempts) {
          break;
        }

        // Log retry attempt
        this.log.warn(`Retrying operation`, {
          operation,
          attempt,
          maxAttempts: this.retryPolicy.maxAttempts,
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error),
        });

        // Wait before retry
        await this.sleep(delay);

        // Calculate next delay with exponential backoff
        delay = Math.min(
          delay * this.retryPolicy.backoffMultiplier,
          this.retryPolicy.maxDelayMs,
        );
      }
    }

    throw new MaxRetriesExhaustedError(
      this.config.serviceName,
      operation,
      this.retryPolicy.maxAttempts,
      lastError,
    );
  }

  // =========================================================================
  // CIRCUIT BREAKER
  // =========================================================================

  /**
   * Execute an operation with circuit breaker protection
   */
  private async executeWithCircuitBreaker<T>(
    operation: string,
    fn: () => Promise<T>,
    options: ApiCallOptions,
  ): Promise<T> {
    if (options.skipCircuitBreaker) {
      return this.executeWithTimeout(fn, options.timeoutMs);
    }

    // Check circuit state
    this.updateCircuitState();

    if (this.circuitState === "open") {
      this.log.warn(`Circuit breaker open`, { operation });
      throw new CircuitBreakerOpenError(this.config.serviceName);
    }

    try {
      const result = await this.executeWithTimeout(fn, options.timeoutMs);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Update circuit state based on timing
   */
  private updateCircuitState(): void {
    if (this.circuitState === "open") {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.circuitBreakerConfig.resetTimeoutMs) {
        this.log.info("Circuit breaker transitioning to half-open");
        this.circuitState = "half-open";
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess(): void {
    if (this.circuitState === "half-open") {
      this.successCount++;
      if (this.successCount >= this.circuitBreakerConfig.successThreshold) {
        this.log.info("Circuit breaker closed");
        this.circuitState = "closed";
        this.failureCount = 0;
      }
    } else if (this.circuitState === "closed") {
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitState === "half-open") {
      this.log.warn(
        "Circuit breaker re-opening after failure in half-open state",
      );
      this.circuitState = "open";
    } else if (
      this.circuitState === "closed" &&
      this.failureCount >= this.circuitBreakerConfig.failureThreshold
    ) {
      this.log.warn("Circuit breaker opening", {
        failureCount: this.failureCount,
        threshold: this.circuitBreakerConfig.failureThreshold,
      });
      this.circuitState = "open";
    }
  }

  /**
   * Get current circuit breaker state (for monitoring)
   */
  getCircuitState(): { state: CircuitState; failureCount: number } {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitState = "closed";
    this.failureCount = 0;
    this.successCount = 0;
    this.log.info("Circuit breaker manually reset");
  }

  // =========================================================================
  // TIMEOUT HANDLING
  // =========================================================================

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs?: number,
  ): Promise<T> {
    const timeout = timeoutMs ?? this.defaultTimeoutMs;

    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      }),
    ]);
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wrap an error with service context
   */
  protected wrapError(
    operation: string,
    error: unknown,
    statusCode?: number,
  ): ExternalApiError {
    const message = error instanceof Error ? error.message : String(error);
    return new ExternalApiError(
      this.config.serviceName,
      operation,
      message,
      error,
      statusCode,
    );
  }
}
