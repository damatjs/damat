export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFormat = "json" | "pretty";

export interface LogContext {
  [key: string]: unknown;
}

export interface LoggerConfig {
  logLevel: LogLevel;
  logFormat: LogFormat;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  };
}

/**
 * Common logging interface implemented by both Logger and ChildLogger.
 * Use this type when accepting a logger parameter.
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): ILogger;
}
