/**
 * Logger instance for the backend
 *
 * Uses the shared logger utility from @damatjs/utils.
 *
 * Usage:
 * ```ts
 * import { logger } from "@/lib/logger";
 *
 * logger.info("Server started");
 * logger.error("Something failed", error, { context: "value" });
 * ```
 */

import { createLogger, getProjectConfig, type Logger } from "@damatjs/utils";

let loggerInstance: Logger | null = null;

/**
 * Initialize the logger with configuration.
 *
 * @returns The initialized logger instance
 */
export function initLogger(): Logger {
  const config = getProjectConfig();
  loggerInstance = createLogger({
    logLevel: config.logLevel ?? "info",
    logFormat: config.logFormat ?? "pretty",
  });
  return loggerInstance;
}

/**
 * Get the logger instance.
 * If not initialized, creates a default logger.
 *
 * @returns The logger instance
 */
export function getLogger(): Logger {
  const config = getProjectConfig();
  if (!loggerInstance) {
    loggerInstance = createLogger({
      logLevel: config.logLevel ?? "info",
      logFormat: config.logFormat ?? "pretty",
    });
  }
  return loggerInstance;
}

/**
 * Reset logger instance (useful for testing)
 */
export function resetLogger(): void {
  loggerInstance = null;
}

/**
 * Proxy that lazily accesses the logger instance.
 * This allows the logger to be used before initialization.
 */
export const logger: Logger = new Proxy({} as Logger, {
  get(_, prop: keyof Logger) {
    return getLogger()[prop];
  },
});

// Re-export types
export type { Logger, ILogger } from "@damatjs/utils";
