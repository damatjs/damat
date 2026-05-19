import type { PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { LoggerInterface } from "../types";
import { TransactionError } from "./error";

export class TransactionContext {
  private client: PoolClient;
  private logger: LoggerInterface;
  private isReleased = false;
  private _isActive = true;

  constructor(client: PoolClient, logger: LoggerInterface) {
    this.client = client;
    this.logger = logger;
  }

  async commit(): Promise<void> {
    if (!this._isActive) throw new TransactionError("Transaction is not active");
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
    if (!this._isActive) return;
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
    if (!this._isActive) throw new TransactionError("Transaction is not active");
    return this.client;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this._isActive) throw new TransactionError("Transaction is not active");
    try {
      const result = await this.client.query<T>(sql, params || []);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Query failed in transaction", { sql: sql.substring(0, 100), error: err.message });
      throw new TransactionError(`Query failed: ${err.message}`, err);
    }
  }

  async createSavepoint(name: string): Promise<void> {
    await this._savepointOp("SAVEPOINT", name);
  }

  async rollbackToSavepoint(name: string): Promise<void> {
    await this._savepointOp("ROLLBACK TO SAVEPOINT", name);
  }

  async releaseSavepoint(name: string): Promise<void> {
    await this._savepointOp("RELEASE SAVEPOINT", name);
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

  private async _savepointOp(op: string, name: string): Promise<void> {
    if (!this._isActive) throw new TransactionError("Transaction is not active");
    const clean = name.replace(/[^a-zA-Z0-9_]/g, "_");
    await this.client.query(`${op} ${clean}`);
    this.logger.debug(`${op} savepoint: ${name}`);
  }
}
