export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type LogFormat = "json" | "pretty" | "simple";

export interface LogContext {
  [key: string]: unknown;
}

export interface FileTransportConfig {
  enabled?: boolean;
  dir?: string;
  errorFile?: string;
  allFile?: string;
  maxSizeBytes?: number;
  bufferFlushMs?: number;
}

export interface LoggerConfig {
  level?: LogLevel;
  format?: LogFormat;
  colors?: boolean;
  timestamp?: boolean;
  prefix?: string;
  file?: FileTransportConfig;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext | undefined;
  error: {
    name: string;
    message: string;
    stack: string | undefined;
  } | undefined;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  fatal(message: string, error?: unknown, context?: LogContext): void;
  child(context: LogContext): ILogger;
  withPrefix(prefix: string): ILogger;
}
