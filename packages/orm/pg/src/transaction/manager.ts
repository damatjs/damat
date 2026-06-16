import type { Pool, PoolClient } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { TransactionOptions } from "@damatjs/orm-type";
import { TransactionContext } from "./context";

// Runtime guard: isolation level is interpolated into SQL, so values that
// bypass the type system (untyped config, JSON input) must be rejected.
const VALID_ISOLATION_LEVELS = new Set([
  "READ UNCOMMITTED",
  "READ COMMITTED",
  "REPEATABLE READ",
  "SERIALIZABLE",
]);

export class TransactionManager {
  private pool: Pool;
  private logger?: ILogger | undefined;
  private activeTransactions: WeakMap<PoolClient, TransactionContext> = new WeakMap();

  constructor(pool: Pool, logger?: ILogger) {
    this.pool = pool;
    this.logger = logger;
  }

  async begin(options: TransactionOptions = {}): Promise<TransactionContext> {
    const client = await this.pool.connect();

    try {
      await this._beginTransaction(client, options);
      const context = new TransactionContext(client, this.logger);
      this.activeTransactions.set(client, context);
      return context;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async run<R>(
    callback: (ctx: TransactionContext) => Promise<R>,
    options: TransactionOptions = {}
  ): Promise<R> {
    const ctx = await this.begin(options);

    try {
      const result = await callback(ctx);
      await ctx.commit();
      return result;
    } catch (error) {
      try {
        await ctx.rollback();
      } catch (rollbackError) {
        // Surface the original failure — a broken rollback must not mask it
        this.logger?.error?.(
          "Transaction rollback failed",
          rollbackError instanceof Error
            ? rollbackError
            : new Error(String(rollbackError))
        );
      }
      throw error;
    } finally {
      ctx.release();
    }
  }

  private async _beginTransaction(
    client: PoolClient,
    options: TransactionOptions
  ): Promise<void> {
    const statements: string[] = [];

    if (options.isolationLevel) {
      if (!VALID_ISOLATION_LEVELS.has(options.isolationLevel)) {
        throw new Error(
          `Invalid transaction isolation level: "${options.isolationLevel}"`
        );
      }
      statements.push(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
    }

    if (options.readOnly !== undefined) {
      statements.push(`SET TRANSACTION ${options.readOnly ? "READ ONLY" : "READ WRITE"}`);
    }

    if (options.readOnly === undefined && options.isolationLevel === undefined && options.deferrable !== undefined) {
      statements.push(`SET TRANSACTION ${options.deferrable ? "" : "NOT "}DEFERRABLE`);
    }

    await client.query("BEGIN");

    for (const stmt of statements) {
      await client.query(stmt);
    }
  }
}
