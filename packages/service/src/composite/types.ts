import type { Logger } from "@damatjs/utils";

/**
 * Service health status
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy";

/**
 * Service health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  dependencies?: Record<string, HealthCheckResult>;
  latencyMs?: number;
}

/**
 * Service metadata for registration/discovery
 */
export interface ServiceMetadata {
  name: string;
  version?: string | undefined;
  description?: string | undefined;
  dependencies?: string[];
}

/**
 * Configuration for composite services
 */
export interface CompositeServiceConfig {
  /** Service name */
  name: string;
  /** Service version */
  version?: string;
  /** Service description */
  description?: string;
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Logger instance */
  logger: Logger;
}

/**
 * Operation metrics data
 */
export interface OperationMetrics {
  operations: Record<string, { count: number; avgLatencyMs: number }>;
}

/**
 * Safe execute options
 */
export interface SafeExecuteOptions<T> {
  fallback?: T;
  rethrow?: boolean;
}

/**
 * Operation definition for parallel execution
 */
export interface OperationDefinition<T> {
  name: string;
  fn: () => Promise<T>;
}

/**
 * Result of parallel operations
 */
export interface ExecuteAllResult<T> {
  results: Array<{ name: string; result: T }>;
  errors: Array<{ name: string; error: Error }>;
}
