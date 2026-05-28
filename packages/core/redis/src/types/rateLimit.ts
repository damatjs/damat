// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the window */
  remaining: number;
  /** Timestamp when the rate limit resets */
  resetAt: number;
  /** Seconds until retry is allowed (only set when not allowed) */
  retryAfter?: number;
}

/**
 * Rate limit configuration for a single window
 */
export interface RateLimitWindow {
  /** Window duration in milliseconds */
  windowMs: number;
  /** Maximum requests allowed in the window */
  maxRequests: number;
}

/**
 * Result of a multi-window rate limit check
 */
export interface MultiRateLimitResult extends RateLimitResult {
  /** Which window triggered the limit (minute, hour, day) */
  limitedBy?: string;
}
