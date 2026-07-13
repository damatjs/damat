import type { ILogger, LogContext, RequestLogData } from "@damatjs/logger";

/**
 * Console-backed ILogger used when no logger is provided. Keeps connection
 * events visible by default (unlike a noop logger) without pretending that
 * `console` satisfies the full ILogger surface.
 */
export const CONSOLE_LOGGER: ILogger = {
  debug: (message: string, context?: LogContext) =>
    console.debug(message, context ?? ""),
  info: (message: string, context?: LogContext) =>
    console.info(message, context ?? ""),
  waiting: (message: string, context?: LogContext) =>
    console.info(message, context ?? ""),
  progress: (message: string, context?: LogContext) =>
    console.info(message, context ?? ""),
  cached: (message: string, context?: LogContext) =>
    console.info(message, context ?? ""),
  success: (message: string, context?: LogContext) =>
    console.info(message, context ?? ""),
  warn: (message: string, context?: LogContext) =>
    console.warn(message, context ?? ""),
  error: (message: string, error?: unknown, context?: LogContext) =>
    console.error(message, error ?? "", context ?? ""),
  fatal: (message: string, error?: unknown, context?: LogContext) =>
    console.error(message, error ?? "", context ?? ""),
  skip: (message: string, context?: LogContext) =>
    console.info(message, context ?? ""),
  child: () => CONSOLE_LOGGER,
  withPrefix: () => CONSOLE_LOGGER,
  request: (data: RequestLogData) => console.info("request", data),
};
