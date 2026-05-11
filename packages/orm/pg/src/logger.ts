/**
 * Query Logger
 */

export interface LoggerOptions {
  enabled: boolean;
  logQueries?: boolean;
  logErrors?: boolean;
  logSlowQueries?: boolean;
  slowQueryThreshold?: number; // ms
  logTransaction?: boolean;
}

export type LogMethod = (level: 'query' | 'error' | 'info', message: string, data?: Record<string, unknown>) => void;

export class QueryLogger {
  private options: Required<LoggerOptions>;
  private logMethod: LogMethod;

  constructor(options: Partial<LoggerOptions> = {}, logMethod?: LogMethod) {
    this.options = {
      enabled: options.enabled ?? true,
      logQueries: options.logQueries ?? true,
      logErrors: options.logErrors ?? true,
      logSlowQueries: options.logSlowQueries ?? true,
      slowQueryThreshold: options.slowQueryThreshold ?? 1000,
      logTransaction: options.logTransaction ?? true,
    };

    this.logMethod = logMethod ?? this.defaultLogMethod;
  }

  private defaultLogMethod = (
    level: 'query' | 'error' | 'info',
    message: string,
    data?: Record<string, unknown>
  ) => {
    const timestamp = new Date().toISOString();
    const prefix = `[ORM][${timestamp}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`, data || '');
        break;
      case 'query':
        console.log(`${prefix} 🔍 ${message}`, data || '');
        break;
      case 'info':
        console.log(`${prefix} ℹ️  ${message}`, data || '');
        break;
    }
  };

  logQuery(sql: string, params?: unknown[]) {
    if (!this.options.enabled || !this.options.logQueries) return;
    
    this.logMethod('query', 'Query executed', {
      sql,
      params: params?.length ? params : undefined,
    });
  }

  logQueryError(error: Error, sql: string, params?: unknown[]) {
    if (!this.options.enabled || !this.options.logErrors) return;
    
    this.logMethod('error', 'Query error', {
      error: error.message,
      sql,
      params: params?.length ? params : undefined,
    });
  }

  logSlowQuery(sql: string, duration: number, params?: unknown[]) {
    if (!this.options.enabled || !this.options.logSlowQueries) return;
    
    if (duration > this.options.slowQueryThreshold) {
      this.logMethod('info', `Slow query (${duration}ms)`, {
        sql,
        params: params?.length ? params : undefined,
        threshold: this.options.slowQueryThreshold,
      });
    }
  }

  logTransaction(action: 'begin' | 'commit' | 'rollback') {
    if (!this.options.enabled || !this.options.logTransaction) return;
    
    this.logMethod('info', `Transaction: ${action}`);
  }

  setOptions(options: Partial<LoggerOptions>) {
    this.options = { ...this.options, ...options };
  }

  enable() {
    this.options.enabled = true;
  }

  disable() {
    this.options.enabled = false;
  }
}

// Global logger instance
let globalLogger: QueryLogger | null = null;

export function getLogger(): QueryLogger {
  if (!globalLogger) {
    globalLogger = new QueryLogger();
  }
  return globalLogger;
}

export function setLogger(logger: QueryLogger) {
  globalLogger = logger;
}

export function configureLogger(options: Partial<LoggerOptions>, logMethod?: LogMethod) {
  globalLogger = new QueryLogger(options, logMethod);
  return globalLogger;
}
