/**
 * Global Middleware Configuration
 * Sets up security, CORS, timing, and error handling middleware
 */

import { Hono, secureHeaders, cors, timing } from "@damatjs/deps/hono";
import { requestSetup, errorHandler } from "../../api/middleware";
import { getProjectConfig } from '@damatjs/utils';
// import { getModuleConfig } from "../../lib/config";

/**
 * Apply all global middleware to the Hono app
 */
export function applyGlobalMiddleware(app: Hono): void {
  const projectConfig = getProjectConfig();

  // Security headers
  app.use("*", secureHeaders());

  // Request timing
  app.use("*", timing());

  // Request setup (adds requestId, startTime)
  app.use("*", requestSetup);

  // CORS
  app.use(
    "*",
    cors({
      origin:
        projectConfig.http.corsOrigin === "*"
          ? "*"
          : projectConfig.http.corsOrigin.split(","),
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "X-API-Key",
        "X-Admin-Secret",
        "X-Request-ID",
      ],
      exposeHeaders: [
        "X-Request-ID",
        "X-Response-Time",
        "X-Credits-Remaining",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "Retry-After",
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
    }),
  );

  // Error handling (must be early in the chain)
  app.use("*", errorHandler);
}
