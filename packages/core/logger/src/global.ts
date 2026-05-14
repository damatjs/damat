import { Logger } from "./logger";
import type { LogContext } from "./types";

let globalLogger: Logger | null = null;

export function createLogger(config?: import("./types").LoggerConfig): Logger {
  return new Logger(config);
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

export function getLogger(): Logger {
  if (!globalLogger) globalLogger = new Logger();
  return globalLogger;
}

export function closeLogger(): void {
  if (globalLogger) {
    globalLogger.close();
    globalLogger = null;
  }
}

export function debug(message: string, context?: LogContext): void {
  getLogger().debug(message, context);
}

export function info(message: string, context?: LogContext): void {
  getLogger().info(message, context);
}

export function warn(message: string, context?: LogContext): void {
  getLogger().warn(message, context);
}

export function error(message: string, error?: Error, context?: LogContext): void {
  getLogger().error(message, error, context);
}

export function fatal(message: string, error?: Error, context?: LogContext): void {
  getLogger().fatal(message, error, context);
}
