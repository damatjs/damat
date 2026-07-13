import type { Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { ConnectionStatus, PoolStats } from "@damatjs/orm-type";
import type { ConnectionManager } from "@damatjs/orm-connector";
import { PgEntityManager } from "@damatjs/orm-pg";

export interface PoolManagerStats {
  totalConnections: number;
  idleConnections: number;
  waitingCount: number;
}

export interface ConnectionManagerLike {
  healthCheck(): Promise<ConnectionStatus>;
  getPoolStats(): PoolStats;
}

interface PoolManagerState {
  pool: Pool | null;
  entityManager: PgEntityManager | null;
  connectionManager: ConnectionManager | null;
}

// State lives on globalThis so that two copies of @damatjs/services in the
// same process (e.g. a linked dev package next to an installed one) still
// share a single pool/entity manager — class statics are per-copy.
const STATE_KEY = Symbol.for("damatjs.services.poolManager");

function getState(): PoolManagerState {
  const holder = globalThis as Record<symbol, PoolManagerState | undefined>;
  if (!holder[STATE_KEY]) {
    holder[STATE_KEY] = { pool: null, entityManager: null, connectionManager: null };
  }
  return holder[STATE_KEY];
}

export class PoolManager {
  private static get pool(): Pool | null {
    return getState().pool;
  }
  private static set pool(value: Pool | null) {
    getState().pool = value;
  }
  private static get entityManager(): PgEntityManager | null {
    return getState().entityManager;
  }
  private static set entityManager(value: PgEntityManager | null) {
    getState().entityManager = value;
  }
  private static get connectionManager(): ConnectionManager | null {
    return getState().connectionManager;
  }
  private static set connectionManager(value: ConnectionManager | null) {
    getState().connectionManager = value;
  }

  private constructor() { }

  static setup({
    connectionManager, pool, logger }: {
      pool: Pool,
      logger: ILogger,
      connectionManager: ConnectionManager
    }
  ): void {
    this.pool = pool;
    this.connectionManager = connectionManager;

    this.entityManager = new PgEntityManager({
      pool,
      logger: logger,
    });
  }

  static getPool(): Pool {
    if (!this.pool) {
      throw new Error("Pool not initialized. Call PoolManager.setup(pool) first.");
    }
    return this.pool;
  }

  static getPgEntityManager(): PgEntityManager {
    if (!this.entityManager) {
      throw new Error("EntityManager not initialized. Call PoolManager.setup(pool) first.");
    }
    return this.entityManager;
  }

  static getConnectionManager(): ConnectionManagerLike | null {
    return this.connectionManager;
  }

  static setEntityManager(em: PgEntityManager): void {
    this.entityManager = em;
  }

  static isInitialized(): boolean {
    return this.pool !== null;
  }

  static hasEntityManager(): boolean {
    return this.entityManager !== null;
  }

  static async healthCheck(): Promise<boolean> {
    if (this.connectionManager) {
      const status = await this.connectionManager.healthCheck();
      return status.connected;
    }
    try {
      const pool = this.getPool();
      const result = await pool.query("SELECT 1 as ok");
      return result.rows.length > 0 && (result.rows[0] as any)?.ok === 1;
    } catch {
      return false;
    }
  }

  static getStats(): PoolManagerStats {
    if (this.connectionManager) {
      const stats = this.connectionManager.getPoolStats();
      return {
        totalConnections: stats.totalCount,
        idleConnections: stats.idleCount,
        waitingCount: stats.waitingCount,
      };
    }
    const pool = this.getPool();
    return {
      totalConnections: pool.totalCount ?? 0,
      idleConnections: pool.idleCount ?? 0,
      waitingCount: pool.waitingCount ?? 0,
    };
  }

  static reset(): void {
    this.pool = null;
    this.entityManager = null;
    this.connectionManager = null;
  }

  /**
   * Drain and end the pg pool, then clear all references. Idempotent: a
   * second call (or a close after reset) is a no-op, and a pool someone else
   * already ended is not ended twice (pg throws on double end()).
   */
  static async close(): Promise<void> {
    const pool = this.pool;
    this.reset();
    if (pool && !pool.ended) {
      await pool.end();
    }
  }
}
