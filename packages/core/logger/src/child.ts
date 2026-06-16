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
    this.parent.logWithPrefix("debug", message, this.prefix, this.merge(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.logWithPrefix("info", message, this.prefix, this.merge(context));
  }

  progress(message: string, context?: LogContext): void {
    this.parent.logWithPrefix("progress", message, this.prefix, this.merge(context));
  }

  cached(message: string, context?: LogContext): void {
    this.parent.logWithPrefix("cached", message, this.prefix, this.merge(context));
  }

  waiting(message: string, context?: LogContext): void {
    this.parent.logWithPrefix("waiting", message, this.prefix, this.merge(context));
  }

  success(message: string, context?: LogContext): void {
    this.parent.logWithPrefix("success", message, this.prefix, this.merge(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.logWithPrefix("warn", message, this.prefix, this.merge(context));
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.parent.logWithPrefix("error", message, this.prefix, this.merge(context), error);
  }

  fatal(message: string, error?: unknown, context?: LogContext): void {
    this.parent.logWithPrefix("fatal", message, this.prefix, this.merge(context), error);
  }

  skip(message: string, context?: LogContext): void {
    this.parent.logWithPrefix("skip", message, this.prefix, this.merge(context));
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
