import { Hono } from "@damatjs/deps/hono";
import { secureHeaders, cors, timing } from "@damatjs/deps/hono";
import type { Context, Next } from "@damatjs/deps/hono";
import { nanoid } from "@damatjs/deps/nanoid";
import { ZodError } from "@damatjs/deps/zod";
import { AppError } from "@damatjs/types";
import type { Logger } from "../types";

export function setupMiddleware(app: Hono, corsOrigin: string, logger: Logger): void {
  app.use("*", secureHeaders());
  app.use("*", timing());
  app.use("*", requestSetup);
  app.use("*", cors(corsConfig(corsOrigin)));
  app.use("*", errorHandler(logger));
}

function corsConfig(origin: string) {
  return {
    origin: origin === "*" ? "*" : origin.split(","),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
    exposeHeaders: ["X-Request-ID", "X-Response-Time", "Retry-After"],
    credentials: true,
    maxAge: 86400,
  };
}

async function requestSetup(c: Context, next: Next): Promise<Response | void> {
  c.set("requestId", nanoid(12));
  c.set("startTime", Date.now());
  await next();
  c.header("X-Request-ID", c.get("requestId"));
  c.header("X-Response-Time", `${Date.now() - c.get("startTime")}ms`);
}

function errorHandler(logger: Logger) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    try {
      await next();
    } catch (error) {
      return handleError(c, error, logger);
    }
  };
}

function handleError(c: Context, error: unknown, logger: Logger): Response {
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

function parseError(error: unknown, logger: Logger, requestId: string, isDev: boolean) {
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

export function notFoundHandler(c: Context): Response {
  return c.json({
    success: false,
    error: { code: "NOT_FOUND", message: "The requested endpoint does not exist" },
    meta: { requestId: c.get("requestId") || "unknown", timestamp: new Date().toISOString() },
  }, 404);
}
