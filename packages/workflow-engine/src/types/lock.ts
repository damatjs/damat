/**
 * Configuration for workflow locking
 */
export interface WorkflowLockConfig {
  /**
   * Unique identifier for the lock.
   * Use a business ID (e.g., orderId, userId) to prevent concurrent
   * processing of the same entity.
   * If not provided, a random ID is generated (unique per execution).
   */
  lockId?: string;
  /**
   * Lock TTL in milliseconds.
   * Should be longer than the expected workflow duration.
   * Default: 300000 (5 minutes)
   */
  ttlMs?: number;
  /**
   * Maximum retries to acquire the lock.
   * Default: 0 (no retries, fail immediately if locked)
   */
  maxRetries?: number;
  /**
   * Delay between lock acquisition retries in milliseconds.
   * Default: 100
   */
  retryDelayMs?: number;
}

/**
 * Result of a workflow lock acquisition attempt
 */
export interface WorkflowLockResult {
  /** Whether the lock was acquired */
  acquired: boolean;
  /** Lock identifier used */
  lockId: string;
  /** Lock value (needed for release) - only set if acquired */
  lockValue?: string;
  /** Full lock key */
  lockKey: string;
}
