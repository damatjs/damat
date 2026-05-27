import type { Context, Next } from "@damatjs/deps/hono";
import { ZodError } from "@damatjs/deps/zod";
import { AppError } from "@damatjs/types";
import type { Logger, ILogger } from "../types";

export function errorHandler(logger: Logger | ILogger) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    try {
      await next();
    } catch (error) {
      return handleError(c, error, logger);
    }
  };
}

function handleError(c: Context, error: unknown, logger: Logger | ILogger): Response {
  const requestId = c.get("requestId") || "unknown";
  const isDev = process.env.NODE_ENV === "development";
  const parsed = parseError(error, logger, requestId, isDev);

  logger.error("Request error", error instanceof Error ? error : undefined, {
    requestId, method: c.req.method, path: c.req.path, status: parsed.statusCode,
  });

  return c.json({
    success: false,
    error: { code: parsed.code, message: parsed.message, details: parsed.details },
    meta: { requestId, timestamp: new Date().toISOString() },
  }, parsed.statusCode as any);
}

function parseError(error: unknown, logger: Logger | ILogger, requestId: string, isDev: boolean) {
  let statusCode = 500, code = "INTERNAL_ERROR", message = "An unexpected error occurred", details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode; code = error.code; message = error.message; details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400; code = "VALIDATION_ERROR"; message = "Request validation failed";
    details = error.issues.map(e => ({ path: e.path.join("."), message: e.message }));
  } else if (error instanceof Error && isDev) {
    message = error.message; details = error.stack;
  }

  return { statusCode, code, message, details };
}