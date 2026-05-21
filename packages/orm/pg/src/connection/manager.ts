import { Pool } from "@damatjs/deps/pg";
import type { PoolClient } from "@damatjs/deps/pg";
import type { ConnectionStatus, PoolStats, LoggerInterface, DbPoolConfigWithExtras } from "../types";
import { ConnectionError } from "./error";
import { setupPoolListeners } from "./listeners";
import { performHealthCheck, fetchPoolStats } from "./status";
import { DefaultLogger } from "../manager/logger";

export class ConnectionManager {
  private pool: Pool | null = null;
  private config: string | Pool | DbPoolConfigWithExtras;
  private logger: LoggerInterface;
  private isConnectedFlag: boolean = false;
  private connectionPromise: Promise<Pool> | null = null;
  private isExternalPool: boolean = false;

  constructor(config: string | Pool | DbPoolConfigWithExtras, logger?: LoggerInterface) {
    this.config = config;
    this.logger = logger ?? new DefaultLogger();
  }

  async connect(): Promise<Pool> {
    if (this.pool && this.isConnectedFlag) return this.pool;
    if (this.connectionPromise) return this.connectionPromise;
    this.connectionPromise = this._createPool();
    return this.connectionPromise;
  }

  private async _createPool(): Promise<Pool> {
    if (typeof this.config === "object" && this.config !== null && "connect" in this.config && "query" in this.config) {
      this.pool = this.config as Pool;
      this.isConnectedFlag = true;
      this.isExternalPool = true;
      this.logger.info("Using pre-configured PostgreSQL pool");
      return this.pool;
    }

    const poolConfig = typeof this.config === "string" ? { connectionString: this.config } : this.config;
    this.pool = new Pool(poolConfig);
    setupPoolListeners(this.pool, this.logger);

    try {
      const client = await this.pool.connect();
      this.isConnectedFlag = true;
      this.logger.info("PostgreSQL connection established successfully");
      client.release();
      return this.pool;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Failed to establish PostgreSQL connection", { error: err.message });
      throw new ConnectionError(`Failed to connect to PostgreSQL: ${err.message}`, err);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return;
    if (this.isExternalPool) {
      this.pool = null;
      this.isConnectedFlag = false;
      this.connectionPromise = null;
      this.logger.info("Released reference to external PostgreSQL connection");
      return;
    }
    try {
      await this.pool.end();
      this.pool = null;
      this.isConnectedFlag = false;
      this.connectionPromise = null;
      this.logger.info("PostgreSQL connection closed");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error closing PostgreSQL connection", { error: err.message });
      throw new ConnectionError(`Failed to disconnect: ${err.message}`, err);
    }
  }

  async healthCheck(): Promise<ConnectionStatus> {
    return performHealthCheck(this.pool, (connected) => { this.isConnectedFlag = connected; });
  }

  getPool(): Pool {
    if (!this.pool) throw new ConnectionError("Not connected to database. Call connect() first.");
    return this.pool;
  }

  getPoolStats(): PoolStats { return fetchPoolStats(this.pool); }
  async getClient(): Promise<PoolClient> { return this.getPool().connect(); }
  isInitialized(): boolean { return this.pool !== null && this.isConnectedFlag; }
}
