// ─── @damatjs/orm-pg ──────────────────────────────────────────────────────────
//
// PostgreSQL ORM core for @damatjs.
//
// Provides:
//   - PgEntityManager (aliased to EntityManager) as the modern client builder and pool manager
//   - PgRepository for ergonomic model access via db.modelName
//   - Transaction management with savepoint support
//   - PgModelClient for low-level or standalone model clients
//

// ─── Core EntityManager & Transaction Manager ───────────────────────────────
export {
  PgEntityManager,
  TransactionalEntityManager,
  EntityManagerError,
  QueryExecutionError,
} from "./manager";

// ─── EntityManager alias (preferred name) ─────────────────────────────────────
import { PgEntityManager } from "./manager";
export const EntityManager = PgEntityManager;

// ─── Model Registry ──────────────────────────────────────────────────────────
export {
  ModelRegistry,
  ModelRegistryError,
} from "./registry";

// ─── Transaction Management ──────────────────────────────────────────────────
export {
  TransactionManager,
  TransactionContext,
  TransactionError,
  TransactionContextError,
} from "./transaction";

// ─── Repository Pattern ──────────────────────────────────────────────────────
export {
  PgRepository,
  createRepository,
  type PgRepositoryConfig,
} from "./repository";

// ─── Low-level executor functions ─────────────────────────────────────────────
export { pgExecuteRaw, pgTransaction } from "./executor";

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

// ─── Type exports ────────────────────────────────────────────────────────────
export type {
  PgSelectResult,
  PgInsertResult,
  PgUpdateResult,
  PgDeleteResult,
  PgQueryResult,
  PgEntityManagerConfig,
  LoggerInterface,
} from "./types";
