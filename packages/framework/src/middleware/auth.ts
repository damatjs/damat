import type { MiddlewareHandler } from "@damatjs/deps/hono";
import { getLogger } from "../services/logger";
import type { AuthType } from "../router/types";

export interface AuthMiddlewareOptions {
  session?: MiddlewareHandler;
  apiKey?: MiddlewareHandler;
  flexible?: MiddlewareHandler;
}

export function createAuthMiddleware(
  type: AuthType,
  options?: AuthMiddlewareOptions
): MiddlewareHandler {
  return async (c, next) => {
    const logger = getLogger();

    if (type === "none") {
      return next();
    }

    const customMiddleware = options?.[type];
    if (customMiddleware) {
      return customMiddleware(c, next);
    }

    // Fail closed: a route that declares auth must never run unauthenticated
    // just because no handler for its auth type was configured.
    logger.error(
      `Auth type "${type}" has no configured handler for ${c.req.method} ${c.req.path}; rejecting request`
    );
    return c.json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      meta: { requestId: c.get("requestId") || "unknown", timestamp: new Date().toISOString() },
    }, 401);
  };
}
