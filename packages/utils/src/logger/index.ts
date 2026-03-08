export * from "./types";
export * from "./config";
export { Logger } from "./logger";
export { ChildLogger } from "./childLogger";

import type { LoggerConfig } from "./types";
import { Logger } from "./logger";

/**
 * Creates a logger instance with the provided configuration.
 *
 * @example
 * import { createLogger, schema, loadConfig } from '@your-org/utils';
 *
 * const rawConfig = loadConfig(process.env);
 * const config = schema.parse(rawConfig);
 * export const logger = createLogger(config);
 *
 * logger.info('App started');
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}
