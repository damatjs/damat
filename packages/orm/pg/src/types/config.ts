import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { ModelDefinition } from "@damatjs/orm-model";

export type { Pool, PoolClient, QueryResultRow };

export interface PgEntityManagerConfig<TModels extends Record<string, ModelDefinition> = Record<string, ModelDefinition>> {
  pool: Pool;
  models: TModels;
  logger?: LoggerInterface;
}

export interface LoggerInterface {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface ModelRegistryEntry<T extends QueryResultRow = QueryResultRow> {
  model: ModelDefinition;
  tableName: string;
  schema: string | undefined;
  columns: string[];
}
