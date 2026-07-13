import { Logger, type ILogger, type LogContext } from "@damatjs/logger";

export interface QueryLoggerOptions {
  enabled?: boolean;
  logQueries?: boolean;
  logErrors?: boolean;
  logSlowQueries?: boolean;
  slowQueryThreshold?: number;
  logTransaction?: boolean;
}

export class QueryLogger {
  private options: Required<QueryLoggerOptions>;
  private logger: ILogger;

  constructor(options: QueryLoggerOptions = {}, logger?: ILogger) {
    this.options = {
      enabled: options.enabled ?? true,
      logQueries: options.logQueries ?? true,
      logErrors: options.logErrors ?? true,
      logSlowQueries: options.logSlowQueries ?? true,
      slowQueryThreshold: options.slowQueryThreshold ?? 1000,
      logTransaction: options.logTransaction ?? true,
    };

    this.logger = logger ?? new Logger({ prefix: "ORM", timestamp: true });
  }

  logQuery(sql: string, params?: unknown[]): void {
    if (!this.options.enabled || !this.options.logQueries) return;

    const context: LogContext = { sql };
    if (params?.length) context.params = params;
    this.logger.debug("Query executed", context);
  }

  logQueryError(error: Error, sql: string, params?: unknown[]): void {
    if (!this.options.enabled || !this.options.logErrors) return;

    const context: LogContext = { sql };
    if (params?.length) context.params = params;
    this.logger.error("Query error", error, context);
  }

  logSlowQuery(sql: string, duration: number, params?: unknown[]): void {
    if (!this.options.enabled || !this.options.logSlowQueries) return;

    if (duration > this.options.slowQueryThreshold) {
      const context: LogContext = {
        sql,
        duration,
        threshold: this.options.slowQueryThreshold,
      };
      if (params?.length) context.params = params;
      this.logger.warn(`Slow query (${duration}ms)`, context);
    }
  }

  logTransaction(action: "begin" | "commit" | "rollback"): void {
    if (!this.options.enabled || !this.options.logTransaction) return;
    this.logger.debug(`Transaction: ${action}`);
  }

  setOptions(options: Partial<QueryLoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  enable(): void {
    this.options.enabled = true;
  }

  disable(): void {
    this.options.enabled = false;
  }
}

let globalLogger: QueryLogger | null = null;

export function getQueryLogger(): QueryLogger {
  if (!globalLogger) {
    globalLogger = new QueryLogger();
  }
  return globalLogger;
}

export function setQueryLogger(logger: QueryLogger): void {
  globalLogger = logger;
}

export function configureQueryLogger(
  options: QueryLoggerOptions,
  logger?: ILogger,
): QueryLogger {
  globalLogger = new QueryLogger(options, logger);
  return globalLogger;
}
