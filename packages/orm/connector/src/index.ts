import { Pool } from "@damatjs/deps/pg";
import type {
  PoolClient,
  DbPoolConfigWithExtras,
  ConnectionStatus,
  PoolStats,
} from "@damatjs/orm-type";
import {
  setupPoolListeners,
  ConnectionError,
  performHealthCheck,
  fetchPoolStats,
} from "./tools";
import { ILogger } from "@damatjs/logger";

export class ConnectionManager {
  private pool: Pool | null = null;
  private config: DbPoolConfigWithExtras;
  private logger?: ILogger | undefined;
  private isConnectedFlag: boolean = false;
  private connectionPromise: Promise<Pool> | null = null;

  constructor(config: DbPoolConfigWithExtras, logger?: ILogger) {
    this.config = config;
    this.logger = logger;
  }

  private async _createPool(): Promise<Pool> {
    this.pool = new Pool(this.config);
    if (this.logger) setupPoolListeners(this.pool, this.logger);

    try {
      const client = await this.pool.connect();
      this.isConnectedFlag = true;
      this.logger?.info("PostgreSQL connection established successfully");
      client.release();
      return this.pool;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger?.error("Failed to establish PostgreSQL connection", {
        error: err.message,
      });
      throw new ConnectionError(
        `Failed to connect to PostgreSQL: ${err.message}`,
        err,
      );
    }
  }

  async connect(): Promise<Pool> {
    if (this.pool && this.isConnectedFlag) return this.pool;
    if (this.connectionPromise) return this.connectionPromise;
    this.connectionPromise = this._createPool();
    return this.connectionPromise;
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.end();
      this.pool = null;
      this.isConnectedFlag = false;
      this.connectionPromise = null;
      this.logger?.info("PostgreSQL connection closed");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger?.error("Error closing PostgreSQL connection", {
        error: err.message,
      });
      throw new ConnectionError(`Failed to disconnect: ${err.message}`, err);
    }
  }

  async healthCheck(): Promise<ConnectionStatus> {
    return performHealthCheck(this.pool, (connected) => {
      this.isConnectedFlag = connected;
    });
  }

  getPool(): Pool {
    if (!this.pool)
      throw new ConnectionError(
        "Not connected to database. Call connect() first.",
      );
    return this.pool;
  }

  getPoolStats(): PoolStats {
    return fetchPoolStats(this.pool);
  }

  async getClient(): Promise<PoolClient> {
    return this.getPool().connect();
  }

  isInitialized(): boolean {
    return this.pool !== null && this.isConnectedFlag;
  }
}

export * from "./tools/config";
