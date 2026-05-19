import type { Pool, PoolClient } from "@damatjs/deps/pg";
import type { TransactionOptions, LoggerInterface } from "../types";
import { TransactionContext } from "./context";

export class TransactionManager {
  private pool: Pool;
  private logger: LoggerInterface;
  private activeTransactions: WeakMap<PoolClient, TransactionContext> = new WeakMap();

  constructor(pool: Pool, logger: LoggerInterface) {
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
      await ctx.rollback();
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
