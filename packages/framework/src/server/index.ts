import { serve } from "@damatjs/deps/hono";
import type { Hono } from "@damatjs/deps/hono";
import type { ServerConfig, Logger, ILogger } from "../types";

export function startServer(
  app: Hono,
  config: ServerConfig,
  logger: Logger | ILogger,
): void {
  serve({ fetch: app.fetch, port: config.port }, (info: { port: number }) => {
    logger.info(`Server running`, { url: `http://localhost:${info.port}` });
  });
}
