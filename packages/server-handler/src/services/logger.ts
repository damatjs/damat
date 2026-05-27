import { createLogger, ILogger, LogContext, NOOP_LOGGER, type Logger, type LoggerConfig } from "@damatjs/logger";

let globalLogger: Logger | null = null;

export function initLogger(config?: LoggerConfig): Logger {
  if (globalLogger) {
    return globalLogger;
  }

  globalLogger = createLogger(config || {
    level: "info",
    format: "pretty",
    timestamp: true,
    prefix: "damat",
  });

  return globalLogger;
}

export function getLogger(): Logger {
  if (!globalLogger) globalLogger = initLogger();
  return globalLogger;
}

export function setGlobalLoggerInstance(logger: Logger): void {
  globalLogger = logger;
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