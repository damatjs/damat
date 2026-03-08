import type { LogContext, ILogger } from "./types";
import type { Logger } from "./logger";

export class ChildLogger implements ILogger {
  constructor(
    private parent: Logger,
    private context: LogContext,
  ) {}

  private mergeContext(additionalContext?: LogContext): LogContext {
    return { ...this.context, ...additionalContext };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }

  child(context: LogContext): ILogger {
    return new ChildLogger(this.parent, this.mergeContext(context));
  }
}
