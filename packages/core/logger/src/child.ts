import type { ILogger, LogContext, RequestLogData } from "./types";
import type { Logger } from "./logger";

export class ChildLogger implements ILogger {
  constructor(
    private parent: Logger,
    private context: LogContext,
    private prefix?: string,
  ) { }

  private merge(additional?: LogContext): LogContext {
    return { ...this.context, ...additional };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.merge(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.merge(context));
  }

  progress(message: string, context?: LogContext): void {
    this.parent.progress(message, this.merge(context));
  }

  cached(message: string, context?: LogContext): void {
    this.parent.cached(message, this.merge(context));
  }

  waiting(message: string, context?: LogContext): void {
    this.parent.waiting(message, this.merge(context));
  }

  success(message: string, context?: LogContext): void {
    this.parent.success(message, this.merge(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.merge(context));
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.parent.error(message, error, this.merge(context));
  }

  fatal(message: string, error?: unknown, context?: LogContext): void {
    this.parent.fatal(message, error, this.merge(context));
  }

  skip(message: string, context?: LogContext): void {
    this.parent.skip(message, this.merge(context));
  }

  child(context: LogContext): ILogger {
    return new ChildLogger(this.parent, this.merge(context), this.prefix);
  }

  withPrefix(prefix: string): ILogger {
    const newPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new ChildLogger(this.parent, this.context, newPrefix);
  }

  request(data: RequestLogData): void {
    this.parent.request(data);
  }
}
