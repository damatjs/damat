import { Logger } from "./logger";
import { NOOP_LOGGER } from "./noop";
import type { LogContext, ILogger, LoggerConfig } from "./types";

let globalLogger: Logger | null = null;

export function createLogger(config?: LoggerConfig): Logger {
  const logger = new Logger(config);
  globalLogger = logger;
  return logger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

export function getLogger(): Logger {
  if (!globalLogger) globalLogger = new Logger();
  return globalLogger;
}

export function clearGlobalLogger(): void {
  globalLogger = null;
}

export function closeLogger(): void {
  if (globalLogger) {
    globalLogger.close();
    globalLogger = null;
  }
}

export function isLoggerConfigured(): boolean {
  return globalLogger !== null;
}

export function createContextLogger(context: LogContext): ILogger {
  if (globalLogger) {
    return globalLogger.child(context);
  }
  return NOOP_LOGGER.child(context);
}

export function debug(message: string, context?: LogContext): void {
  getLogger().debug(message, context);
}

export function info(message: string, context?: LogContext): void {
  getLogger().info(message, context);
}

export function progress(message: string, context?: LogContext): void {
  getLogger().progress(message, context);
}

export function cached(message: string, context?: LogContext): void {
  getLogger().cached(message, context);
}

export function waiting(message: string, context?: LogContext): void {
  getLogger().waiting(message, context);
}

export function warn(message: string, context?: LogContext): void {
  getLogger().warn(message, context);
}

export function error(
  message: string,
  err?: unknown,
  context?: LogContext,
): void {
  getLogger().error(message, err, context);
}

export function fatal(
  message: string,
  err?: unknown,
  context?: LogContext,
): void {
  getLogger().fatal(message, err, context);
}
