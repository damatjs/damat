/**
 * Rate limiting middleware for Hono
 * TODO: Implement with Redis-based rate limiting
 */

import { Context, Next } from "hono";
// import { RateLimitError } from '@damatjs/types';

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Rate limiting middleware for API key requests
 */
export async function rateLimitMiddleware(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const apiKey = c.get("apiKey");

  if (!apiKey) {
    // No API key, skip rate limiting (will fail on auth)
    await next();
    return;
  }

  // const result = await apiKeyService.checkRateLimit(apiKey);

  // Always add rate limit headers
  // c.header('X-RateLimit-Remaining', result.remaining.toString());
  // c.header('X-RateLimit-Reset', new Date(result.resetAt).toISOString());

  // if (!result.allowed) {
  //     c.header('Retry-After', (result.retryAfter || 60).toString());
  //     throw new RateLimitError(result.retryAfter || 60);
  // }

  await next();
}
