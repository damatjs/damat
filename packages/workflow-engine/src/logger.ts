/**
 * Workflow Engine - Logger
 *
 * Logger integration using @damatjs/utils ILogger interface.
 * Supports dependency injection of custom loggers.
 */

import type { ILogger } from "@damatjs/utils";

// =============================================================================
// LOGGER INSTANCE
// =============================================================================

/**
 * Module-level logger instance.
 * Can be set via setLogger() for dependency injection.
 */
let currentLogger: ILogger | null = null;

/**
 * Get the current logger instance.
 * Returns null if no logger has been set.
 *
 * @returns Current logger or null
 */
export function getLogger(): ILogger | null {
  return currentLogger;
}

/**
 * Set the logger instance for the workflow engine.
 * This should be called during application initialization.
 *
 * @param logger - Logger instance implementing ILogger interface
 *
 * @example
 * ```typescript
 * import { setLogger } from '@damatjs/workflow-engine';
 * import { createLogger } from '@damatjs/utils';
 *
 * const appLogger = createLogger({ logLevel: 'info', logFormat: 'json' });
 * setLogger(appLogger);
 * ```
 */
export function setLogger(logger: ILogger): void {
  currentLogger = logger;
}

/**
 * Clear the logger instance.
 */
export function clearLogger(): void {
  currentLogger = null;
}

// =============================================================================
// INTERNAL LOGGING HELPERS
// =============================================================================

/**
 * Create a child logger for a specific workflow/step context.
 * Falls back to no-op if no logger is set.
 *
 * @internal
 */
export function createContextLogger(context: Record<string, unknown>): ILogger {
  if (currentLogger) {
    return currentLogger.child(context);
  }
  // Return no-op logger if none configured
  return {
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
    child: () => createContextLogger({}),
  };
}
