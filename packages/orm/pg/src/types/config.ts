import type { Pool, PoolClient, QueryResultRow } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { ModelDefinition } from "@damatjs/orm-model";

export type { Pool, PoolClient, QueryResultRow };
export type { ILogger };

export interface PgEntityManagerConfig<
  TModels extends Record<string, ModelDefinition> = Record<
    string,
    ModelDefinition
  >,
> {
  pool: Pool;
  logger?: ILogger;
  models?: TModels;
}
