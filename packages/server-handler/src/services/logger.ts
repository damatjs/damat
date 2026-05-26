import { createLogger, type ILogger, type LoggerConfig } from "@damatjs/logger";

let globalLogger: ILogger | null = null;

export function initLogger(config?: LoggerConfig): ILogger {
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

export function getLogger(): ILogger {
  if (!globalLogger) {
    throw new Error("Logger not initialized. Call initLogger() first.");
  }
  return globalLogger;
}

export function setGlobalLoggerInstance(logger: ILogger): void {
  globalLogger = logger;
}
