import type { MiddlewareHandler } from "@damatjs/deps/hono";
import { hasRedis, getRedis } from "../services/redis";
import { getLogger } from "../services/logger";
import { checkRateLimit } from "@damatjs/redis";
import { parseWindowToMs } from "../utils/windowParser";
import { HttpRateLimitConfig } from '../config';


export function createRateLimitMiddleware(
  config: HttpRateLimitConfig,
  globalConfig?: HttpRateLimitConfig
): MiddlewareHandler {
  return async (c, next) => {
    const logger = getLogger();

    if (!hasRedis()) {
      logger.warn("Redis not available, skipping rate limit");
      return next();
    }

    const redis = getRedis();

    const apiKey = c.req.header("x-api-key");
    const userId = c.get("userId") as string | undefined;
    const forwardedFor = c.req.header("x-forwarded-for");
    const firstIp = forwardedFor?.split(",")[0];
    const ip = firstIp ? firstIp.trim() : "unknown";

    const identifier = apiKey
      ? `apikey:${apiKey}`
      : userId
        ? `user:${userId}`
        : `ip:${ip}`;

    let effectiveConfig = config;

    if (userId && globalConfig?.getUserTier) {
      try {
        const tierConfig = await globalConfig.getUserTier(userId);
        if (tierConfig) {
          effectiveConfig = tierConfig;
        }
      } catch (err) {
        logger.error("Failed to get user tier for rate limit", err instanceof Error ? err : undefined);
      }
    }


    if (apiKey && globalConfig?.getApiKeyTier) {
      try {
        const tierConfig = await globalConfig.getApiKeyTier(apiKey);
        if (tierConfig) {
          effectiveConfig = tierConfig;
        }
      } catch (err) {
        logger.error("Failed to get API key tier for rate limit", err instanceof Error ? err : undefined);
      }
    }

    const windowMs = parseWindowToMs(effectiveConfig.window);
    const key = `ratelimit:${identifier}:${c.req.path}`;

    try {
      const result = await checkRateLimit(key, windowMs, effectiveConfig.requests, redis);

      c.header("X-RateLimit-Limit", String(effectiveConfig.requests));
      c.header("X-RateLimit-Remaining", String(result.remaining));
      c.header("X-RateLimit-Reset", String(result.resetAt));

      if (!result.allowed) {
        c.header("Retry-After", String(result.retryAfter || 0));
        return c.json({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            details: {
              retryAfter: result.retryAfter,
              limit: effectiveConfig.requests,
              window: effectiveConfig.window,
            },
          },
        }, 429);
      }

      return next();
    } catch (err) {
      logger.error("Rate limit check failed", err instanceof Error ? err : undefined);
      return next();
    }
  };
}
