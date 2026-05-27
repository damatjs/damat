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

    logger.warn(`Auth type "${type}" not implemented, passing through`);
    return next();
  };
}
