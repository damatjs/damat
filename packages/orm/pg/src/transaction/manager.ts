import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { TransactionOptions, LoggerInterface } from "../core/types";

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

    if (options.deferrable !== undefined) {
      statements.push(`SET TRANSACTION ${options.deferrable ? "" : "NOT "}DEFERRABLE`);
    }

    await client.query("BEGIN");
    
    for (const stmt of statements) {
      await client.query(stmt);
    }
  }
}

export class TransactionContext {
  private client: PoolClient;
  private logger: LoggerInterface;
  private isReleased: boolean = false;
  private _isActive: boolean = true;

  constructor(client: PoolClient, logger: LoggerInterface) {
    this.client = client;
    this.logger = logger;
  }

  async commit(): Promise<void> {
    if (!this._isActive) {
      throw new TransactionError("Transaction is not active");
    }

    try {
      await this.client.query("COMMIT");
      this._isActive = false;
      this.logger.debug("Transaction committed");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Failed to commit transaction", { error: err.message });
      throw new TransactionError(`Commit failed: ${err.message}`, err);
    }
  }

  async rollback(): Promise<void> {
    if (!this._isActive) {
      return;
    }

    try {
      await this.client.query("ROLLBACK");
      this._isActive = false;
      this.logger.debug("Transaction rolled back");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Failed to rollback transaction", { error: err.message });
      throw new TransactionError(`Rollback failed: ${err.message}`, err);
    }
  }

  getClient(): PoolClient {
    if (!this._isActive) {
      throw new TransactionError("Transaction is not active");
    }
    return this.client;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this._isActive) {
      throw new TransactionError("Transaction is not active");
    }

    try {
      const result = await this.client.query<T>(sql, params || []);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Query failed in transaction", { 
        sql: sql.substring(0, 100), 
        error: err.message 
      });
      throw new TransactionError(`Query failed: ${err.message}`, err);
    }
  }

  async createSavepoint(name: string): Promise<void> {
    if (!this._isActive) {
      throw new TransactionError("Transaction is not active");
    }

    await this.client.query(`SAVEPOINT ${this._sanitizeSavepointName(name)}`);
    this.logger.debug(`Savepoint created: ${name}`);
  }

  async rollbackToSavepoint(name: string): Promise<void> {
    if (!this._isActive) {
      throw new TransactionError("Transaction is not active");
    }

    await this.client.query(`ROLLBACK TO SAVEPOINT ${this._sanitizeSavepointName(name)}`);
    this.logger.debug(`Rolled back to savepoint: ${name}`);
  }

  async releaseSavepoint(name: string): Promise<void> {
    if (!this._isActive) {
      throw new TransactionError("Transaction is not active");
    }

    await this.client.query(`RELEASE SAVEPOINT ${this._sanitizeSavepointName(name)}`);
    this.logger.debug(`Savepoint released: ${name}`);
  }

  release(): void {
    if (!this.isReleased) {
      this.client.release();
      this.isReleased = true;
    }
  }

  isActive(): boolean {
    return this._isActive && !this.isReleased;
  }

  private _sanitizeSavepointName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, "_");
  }
}

export class TransactionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "TransactionError";
  }
}
