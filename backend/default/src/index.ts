/**
 * Damatjs API - Main Entry Point
 *
 * Full-featured backend with auth, teams, billing, and usage tracking.
 * Uses Next.js-style file-based routing for API routes.
 *
 * Configuration is loaded synchronously from damat.config.ts before
 * this file runs, so config is available immediately.
 */

// Config is loaded when damat.config.ts is imported
import "../damat.config";

import { logger } from "@/lib/logger";
import { bootstrap, startServer } from "@/server/bootstrap";
import { registerShutdownHandlers } from "@/server/shutdown";

async function main() {
  const { app } = await bootstrap();
  startServer(app);
}

registerShutdownHandlers();

main().catch((err) => {
  logger.error(
    "Failed to start server",
    err instanceof Error ? err : undefined,
  );
  process.exit(1);
});
