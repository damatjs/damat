import type { Context, Next } from "@damatjs/deps/hono";
import type { Logger, ILogger } from "../../types";
import { handleError } from "./handleError";

export function errorHandler(logger: Logger | ILogger) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    try {
      await next();
    } catch (error) {
      return handleError(c, error, logger);
    }
  };
}

export * from "./code";
