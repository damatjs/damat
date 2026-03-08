/**
 * Start the HTTP server
 */

import { serve } from "@hono/node-server";
import type { Hono } from "@damatjs/deps/hono";

import { getProjectConfig } from '@damatjs/utils';
import { logger } from "@/lib/logger";

export function startServer(app: Hono): void {
  const projectConfig = getProjectConfig();
  const port = projectConfig.http.port;

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logger.info(`Damatjs API running`, {
        url: `http://localhost:${info.port}`,
        env: projectConfig.nodeEnv,
      });
    },
  );
}
