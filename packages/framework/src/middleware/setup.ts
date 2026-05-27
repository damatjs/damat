import { Hono } from "@damatjs/deps/hono";
import { secureHeaders, cors, timing } from "@damatjs/deps/hono";
import type { Logger, ILogger } from "../types";
import { requestSetup } from './requestSetup';
import { corsConfigSetter, CorsConfigType } from './corsConfig';
import { errorHandler } from './error';

export function setupMiddleware({
  app,
  logger,
  corsConfig
}:
  {
    app: Hono,
    corsConfig?: string | CorsConfigType | undefined,
    logger: Logger | ILogger
  }): void {
  app.use("*", secureHeaders());
  app.use("*", timing());
  app.use("*", requestSetup);
  app.use("*", cors(corsConfigSetter(corsConfig)));
  app.use("*", errorHandler(logger));
}

