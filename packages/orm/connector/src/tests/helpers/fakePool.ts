import { EventEmitter } from "node:events";
import type { ILogger, LogContext, RequestLogData } from "@damatjs/logger";

/**
 * A minimal fake `pg` PoolClient. It records query calls and lets a test
 * control whether `query` resolves or rejects. `release` is a spy-able mock.
 */
export class FakePoolClient {
  public queries: unknown[][] = [];
  public released = false;
  public releaseError: Error | undefined;
  private queryImpl: (args: unknown[]) => Promise<unknown>;

  constructor(opts: { queryImpl?: (args: unknown[]) => Promise<unknown> } = {}) {
    this.queryImpl =
      opts.queryImpl ?? (async () => ({ rows: [{ "?column?": 1 }], rowCount: 1 }));
  }

  query = (...args: unknown[]): Promise<unknown> => {
    this.queries.push(args);
    return this.queryImpl(args);
  };

  release = (err?: Error): void => {
    this.released = true;
    this.releaseError = err;
  };
}

export interface FakePoolOptions {
  /** When set, `connect()` rejects with this error. */
  connectError?: Error;
  /** When set, `end()` rejects with this error. */
  endError?: Error;
  /** Client returned by `connect()`. Defaults to a fresh FakePoolClient. */
  client?: FakePoolClient;
  /** Initial pool stat counters. */
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
}

/**
 * A fake `pg` Pool built on Node's EventEmitter so tests can:
 *  - assert event listeners are registered,
 *  - emit("connect"|"acquire"|"release"|"remove"|"error", ...) to drive handlers,
 *  - control success/failure of connect()/end() without any live database.
 */
export class FakePool extends EventEmitter {
  public totalCount: number;
  public idleCount: number;
  public waitingCount: number;
  public ended = false;
  public connectCalls = 0;
  public endCalls = 0;
  public readonly client: FakePoolClient;
  private readonly connectError?: Error;
  private readonly endError?: Error;

  constructor(opts: FakePoolOptions = {}) {
    super();
    this.client = opts.client ?? new FakePoolClient();
    this.connectError = opts.connectError;
    this.endError = opts.endError;
    this.totalCount = opts.totalCount ?? 0;
    this.idleCount = opts.idleCount ?? 0;
    this.waitingCount = opts.waitingCount ?? 0;
  }

  connect = async (): Promise<FakePoolClient> => {
    this.connectCalls += 1;
    if (this.connectError) throw this.connectError;
    this.totalCount += 1;
    return this.client;
  };

  end = async (): Promise<void> => {
    this.endCalls += 1;
    if (this.endError) throw this.endError;
    this.ended = true;
  };
}

interface LogCall {
  message: string;
  context?: LogContext;
  error?: unknown;
}

/**
 * A stub ILogger that records every call so tests can assert which messages
 * were logged at which level, without any real console output.
 */
export class StubLogger implements ILogger {
  public calls: Record<string, LogCall[]> = {
    debug: [],
    info: [],
    waiting: [],
    progress: [],
    cached: [],
    success: [],
    warn: [],
    error: [],
    fatal: [],
    skip: [],
  };

  private record(level: string, message: string, context?: LogContext, error?: unknown) {
    this.calls[level]!.push({ message, context, error });
  }

  debug(message: string, context?: LogContext): void { this.record("debug", message, context); }
  info(message: string, context?: LogContext): void { this.record("info", message, context); }
  waiting(message: string, context?: LogContext): void { this.record("waiting", message, context); }
  progress(message: string, context?: LogContext): void { this.record("progress", message, context); }
  cached(message: string, context?: LogContext): void { this.record("cached", message, context); }
  success(message: string, context?: LogContext): void { this.record("success", message, context); }
  warn(message: string, context?: LogContext): void { this.record("warn", message, context); }
  error(message: string, error?: unknown, context?: LogContext): void { this.record("error", message, context, error); }
  fatal(message: string, error?: unknown, context?: LogContext): void { this.record("fatal", message, context, error); }
  skip(message: string, context?: LogContext): void { this.record("skip", message, context); }
  child(): ILogger { return this; }
  withPrefix(): ILogger { return this; }
  request(_data: RequestLogData): void {}

  /** Convenience: messages logged at a level (in order). */
  messages(level: keyof StubLogger["calls"]): string[] {
    return this.calls[level]!.map((c) => c.message);
  }
}
