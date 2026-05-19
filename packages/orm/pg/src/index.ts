// ─── @damatjs/orm-pg ──────────────────────────────────────────────────────────
//
// PostgreSQL ORM core for @damatjs.
//
// Provides:
//   - EntityManager for connection management, model registry, and lifecycle
//   - Repository pattern for type-safe CRUD operations
//   - Transaction management with savepoint support
//   - Low-level query executors for direct SQL execution
//
// Usage:
//
//   import { EntityManager } from "@damatjs/orm-pg";
//   import { UserSchema, OrderSchema } from "./schemas";
//
//   const em = await EntityManager.create({
//     connection: process.env.DATABASE_URL!,
//     models: { User: UserSchema, Order: OrderSchema },
//   });
//
//   // Short API
//   const users = await em.repo<User>("User").findMany({ where: { verified: true } });
//   await em.tx(async (tx) => { await tx.repo<User>("User").create({ ... }); });
//   const result = await em.execute<User>("SELECT * FROM users");
//   await em.close();
//
//   // Or long API
//   const userRepo = em.getRepository<User>("User");
//   await em.transaction(async (tx) => { ... });
//   await em.shutdown();

// ─── Core EntityManager ──────────────────────────────────────────────────────
export {
  PgEntityManager,
  TransactionalEntityManager,
  EntityManagerError,
  QueryExecutionError,
  type PgEntityManagerConfig,
  type LoggerInterface,
  type ConnectionStatus,
  type PoolStats,
  type TransactionOptions,
  type TransactionIsolationLevel,
  type QueryContext,
} from "./core";

// ─── EntityManager alias (preferred name) ─────────────────────────────────────
import { PgEntityManager } from "./core";
export const EntityManager = PgEntityManager;

// ─── Connection Management ───────────────────────────────────────────────────
export {
  ConnectionManager,
  ConnectionError,
} from "./core";

// ─── Model Registry ──────────────────────────────────────────────────────────
export {
  ModelRegistry,
  ModelRegistryError,
  type ModelRegistryEntry,
} from "./core";

// ─── Transaction Management ──────────────────────────────────────────────────
export {
  TransactionManager,
  TransactionContext,
  TransactionError,
} from "./transaction";

// ─── Repository Pattern ──────────────────────────────────────────────────────
export {
  PgRepository,
  createRepository,
  type PgRepositoryConfig,
} from "./repository";

// ─── Result types ────────────────────────────────────────────────────────────
export type {
  PgSelectResult,
  PgInsertResult,
  PgUpdateResult,
  PgDeleteResult,
  PgQueryResult,
} from "./types";

// ─── Low-level executor functions ─────────────────────────────────────────────
export {
  pgExecuteRaw,
  pgSelect,
  pgInsert,
  pgUpdate,
  pgDelete,
  pgTransaction,
} from "./executor";

// ─── PgModelClient — ergonomic bound client ───────────────────────────────────
export { PgModelClient } from "./client";

// ─── Query Logger ─────────────────────────────────────────────────────────────
export {
  QueryLogger,
  getQueryLogger,
  setQueryLogger,
  configureQueryLogger,
  type QueryLoggerOptions,
} from "./logger";

// ─── Short API Methods ────────────────────────────────────────────────────────
import type { QueryResultRow } from "@damatjs/deps/pg";
import type { PgRepository } from "./repository";
import type { TransactionalEntityManager } from "./core";

declare module "./core" {
  interface PgEntityManager {
    repo<T extends QueryResultRow>(name: string): PgRepository<T>;
    tx<R>(cb: (tx: TransactionalEntityManager) => Promise<R>): Promise<R>;
    execute<T extends QueryResultRow>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
    close(): Promise<void>;
  }
}

PgEntityManager.prototype.repo = function<T extends QueryResultRow>(name: string) { return this.getRepository<T>(name); };
PgEntityManager.prototype.tx = function<R>(cb: (tx: TransactionalEntityManager) => Promise<R>) { return this.transaction<R>(cb); };
PgEntityManager.prototype.execute = function<T extends QueryResultRow>(sql: string, params?: unknown[]) { return this.raw<T>(sql, params); };
PgEntityManager.prototype.close = function() { return this.shutdown(); };
