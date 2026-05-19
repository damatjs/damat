import { Pool } from "@damatjs/deps/pg";
import type { PoolClient } from "@damatjs/deps/pg";
import type { ConnectionStatus, PoolStats, LoggerInterface, DbPoolConfigWithExtras } from "./types";

export class ConnectionManager {
  private pool: Pool | null = null;
  private config: string | DbPoolConfigWithExtras;
  private logger: LoggerInterface;
  private isConnectedFlag: boolean = false;
  private connectionPromise: Promise<Pool> | null = null;

  constructor(config: string | DbPoolConfigWithExtras, logger: LoggerInterface) {
    this.config = config;
    this.logger = logger;
  }

  async connect(): Promise<Pool> {
    if (this.pool && this.isConnectedFlag) {
      return this.pool;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._createPool();
    return this.connectionPromise;
  }

  private async _createPool(): Promise<Pool> {
    const poolConfig = typeof this.config === "string" 
      ? { connectionString: this.config } 
      : this.config;

    this.pool = new Pool(poolConfig);
    
    this.pool.on("error", (err) => {
      this.logger.error("PostgreSQL pool error", { error: err.message });
    });

    this.pool.on("connect", () => {
      this.logger.debug("New client connected to pool");
    });

    this.pool.on("acquire", () => {
      this.logger.debug("Client acquired from pool");
    });

    this.pool.on("release", () => {
      this.logger.debug("Client released back to pool");
    });

    this.pool.on("remove", () => {
      this.logger.debug("Client removed from pool");
    });

    try {
      const client = await this.pool.connect();
      this.isConnectedFlag = true;
      this.logger.info("PostgreSQL connection established successfully");
      client.release();
      return this.pool;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Failed to establish PostgreSQL connection", { 
        error: err.message 
      });
      throw new ConnectionError(`Failed to connect to PostgreSQL: ${err.message}`, err);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.pool) {
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
    const poolStats = this.getPoolStats();
    const now = new Date();

    if (!this.pool) {
      return {
        connected: false,
        poolStats,
        lastChecked: now,
      };
    }

    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();
      this.isConnectedFlag = true;

      return {
        connected: true,
        poolStats: this.getPoolStats(),
        lastChecked: now,
      };
    } catch (error) {
      this.isConnectedFlag = false;
      return {
        connected: false,
        poolStats,
        lastChecked: now,
      };
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new ConnectionError("Not connected to database. Call connect() first.");
    }
    return this.pool;
  }

  getPoolStats(): PoolStats {
    if (!this.pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }
    return {
      totalCount: this.pool.totalCount ?? 0,
      idleCount: this.pool.idleCount ?? 0,
      waitingCount: this.pool.waitingCount ?? 0,
    };
  }

  async getClient(): Promise<PoolClient> {
    const pool = this.getPool();
    return pool.connect();
  }

  isInitialized(): boolean {
    return this.pool !== null && this.isConnectedFlag;
  }
}

export class ConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ConnectionError";
  }
}
