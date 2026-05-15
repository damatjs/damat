import type { ILogger, LogContext, RequestLogData } from "./types";

export class NoopLogger implements ILogger {
  private context: LogContext;
  private prefixStack: string | undefined;

  constructor(context: LogContext = {}, prefix?: string) {
    this.context = context;
    this.prefixStack = prefix;
  }

  debug(_message: string, _context?: LogContext): void { }
  info(_message: string, _context?: LogContext): void { }
  success(_message: string, _context?: LogContext): void { }
  warn(_message: string, _context?: LogContext): void { }
  error(_message: string, _error?: unknown, _context?: LogContext): void { }
  fatal(_message: string, _error?: unknown, _context?: LogContext): void { }
  skip(_message: string, _context?: LogContext): void { }

  child(context: LogContext): ILogger {
    return new NoopLogger({ ...this.context, ...context }, this.prefixStack);
  }

  withPrefix(prefix: string): ILogger {
    const newPrefix = this.prefixStack ? `${this.prefixStack}:${prefix}` : prefix;
    return new NoopLogger(this.context, newPrefix);
  }

  request(_data: RequestLogData): void { }
}

export const NOOP_LOGGER = new NoopLogger();
