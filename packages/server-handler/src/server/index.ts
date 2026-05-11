import { serve } from "@damatjs/deps/hono";
import type { Hono } from "@damatjs/deps/hono";
import type { ServerConfig, Logger } from "../types";

export function startServer(app: Hono, config: ServerConfig, logger: Logger): void {
  serve({ fetch: app.fetch, port: config.port }, (info: { port: number }) => {
    logger.info(`Server running`, { url: `http://localhost:${info.port}` });
  });
}
