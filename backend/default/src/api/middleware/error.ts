/**
 * Error handling middleware
 */

import { Context, Next } from "@damatjs/deps/hono";
import { HTTPException } from '@damatjs/deps/hono';
import { ZodError } from '@damatjs/deps/zod';
import { AppError, ValidationError, RateLimitError } from "@damatjs/types";
import { logger } from "@/lib/logger";
import { getProjectConfig } from '@damatjs/utils';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Global error handling middleware
 */
export async function errorHandler(
  c: Context,
  next: Next,
): Promise<Response | void> {
  try {
    await next();
  } catch (error) {
    const requestId = c.get("requestId") || "unknown";
    const moduleConfig = getProjectConfig();
    const isDev = moduleConfig.nodeEnv === "development";

    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let details: unknown = undefined;

    // Handle different error types
    if (error instanceof AppError) {
      statusCode = error.statusCode;
      errorCode = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof ZodError) {
      statusCode = 400;
      errorCode = "VALIDATION_ERROR";
      message = "Request validation failed";
      details = error.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
    } else if (error instanceof HTTPException) {
      statusCode = error.status;
      errorCode = getErrorCodeFromStatus(error.status);
      message = error.message;
    } else if (error instanceof Error) {
      // Log unexpected errors
      logger.error("Unhandled error", error, { requestId });

      // Only show error details in development
      if (isDev) {
        message = error.message;
        details = error.stack;
      }
    }

    // Log request error
    const startTime = c.get("startTime") || Date.now();
    logger.error("Request error", error instanceof Error ? error : undefined, {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: statusCode,
      duration: Date.now() - startTime,
      teamId: c.get("team")?.id,
      userId: c.get("user")?.id,
      apiKeyId: c.get("apiKey")?.id,
    });

    const response: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    // Add rate limit headers for rate limit errors
    if (error instanceof RateLimitError) {
      c.header(
        "Retry-After",
        (error.details as any)?.retryAfter?.toString() || "60",
      );
    }

    return c.json(response, statusCode as any);
  }
}

/**
 * Not found handler
 */
export function notFoundHandler(c: Context): Response {
  const requestId = c.get("requestId") || "unknown";

  const response: ErrorResponse = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint does not exist",
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return c.json(response, 404);
}

/**
 * Get error code from HTTP status
 */
function getErrorCodeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 405:
      return "METHOD_NOT_ALLOWED";
    case 408:
      return "REQUEST_TIMEOUT";
    case 409:
      return "CONFLICT";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 422:
      return "UNPROCESSABLE_ENTITY";
    case 429:
      return "RATE_LIMITED";
    case 500:
      return "INTERNAL_ERROR";
    case 502:
      return "BAD_GATEWAY";
    case 503:
      return "SERVICE_UNAVAILABLE";
    case 504:
      return "GATEWAY_TIMEOUT";
    default:
      return "UNKNOWN_ERROR";
  }
}

/**
 * Validation helper to wrap Zod parsing
 */
export function validate<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown,
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Validation failed", error.issues);
    }
    throw error;
  }
}
