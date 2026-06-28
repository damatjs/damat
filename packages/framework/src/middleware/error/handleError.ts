import { HTTPException, type Context } from "@damatjs/deps/hono";
import { ZodError } from "@damatjs/deps/zod";
import { AppError } from "@damatjs/types";
import type { Logger, ILogger } from "../../types";
import { getErrorCodeFromStatus } from './code';

export function handleError(c: Context, error: unknown, logger: Logger | ILogger): Response {
  const requestId = c.get("requestId") || "unknown";
  const isDev = process.env.NODE_ENV === "development";
  const parsed = parseError(error, logger, requestId, isDev);

  logger.error(
    "Request error",
    error instanceof Error ? error : undefined,
    {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: parsed.statusCode,
    });

  return c.json({
    success: false,
    error: { code: parsed.code, message: parsed.message, details: parsed.details },
    meta: { requestId, timestamp: new Date().toISOString() },
  }, parsed.statusCode as any);
}


function parseError(error: unknown, logger: Logger | ILogger, requestId: string, isDev: boolean) {
  let statusCode = 500
  let code = "INTERNAL_ERROR"
  let message = "An unexpected error occurred"
  let details: unknown = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = error.issues.map(e => ({
      path: e.path.join("."),
      message: e.message
    }));
  } else if (error instanceof HTTPException) {
    statusCode = error.status;
    code = getErrorCodeFromStatus(error.status);
    message = error.message;
  }
  else if (error instanceof Error) {

    logger.error("Unhandled error", error, { requestId });
    if (isDev) {
      message = error.message;
      details = error.stack;
    }
  }
  else {
    // A non-Error value was thrown (e.g. `throw "boom"` or `throw { code: 1 }`).
    // None of the branches above match, so without this the thrown value would
    // be lost entirely from the logs. Capture a safe string form so the failure
    // is still observable, and surface it in development like a generic Error.
    const thrown = safeStringify(error);
    logger.error("Unhandled non-error throw", undefined, { requestId, thrown });
    if (isDev) {
      message = thrown;
    }
  }

  return { statusCode, code, message, details };
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    // Circular references or non-serializable values fall back to String().
    return String(value);
  }
}
