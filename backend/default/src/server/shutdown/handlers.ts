/**
 * Register all shutdown and error handlers
 */

import { logger } from "@/lib/logger";
import { shutdown } from "./shutdown";

export function registerShutdownHandlers(): void {
  // Graceful shutdown signals
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Handle uncaught errors
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error(
      "Unhandled rejection",
      reason instanceof Error ? reason : undefined,
    );
    process.exit(1);
  });
}
