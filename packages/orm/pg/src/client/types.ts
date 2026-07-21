import type { Pool, PoolClient, QueryResultRow } from "@damatjs/orm-type";
import type { QueryLogger } from "@damatjs/orm-core";
import type { ModelAccessor } from "../query";
import type {
  FindOptions,
  CreateOptions,
  CreateManyOptions,
  UpdateOptions,
  DeleteOptions,
  UpsertOptions,
  UpsertManyOptions,
} from "../query/accessor/type";

export interface PgModelClientLike<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
> {
  accessor: ModelAccessor<Cols>;
  _pool: Pool;
  _conn: Pool | PoolClient;
  _logger: QueryLogger | undefined;
  withClient(client: PoolClient): PgModelClientLike<T, Cols>;
}

export interface FindOneOptions<Cols extends string = string> extends Omit<
  FindOptions<Cols>,
  "limit" | "offset"
> {}

export type {
  FindOptions,
  CreateOptions,
  CreateManyOptions,
  UpdateOptions,
  DeleteOptions,
  UpsertOptions,
  UpsertManyOptions,
};
