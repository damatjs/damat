import type { Pool, PoolClient, QueryResultRow } from "@damatjs/orm-type";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { QueryLogger } from "@damatjs/orm-core";
import { ModelAccessor } from "../query";
import { executeFindMany, executeFindOne } from "./ops/find";
import {
  executeCreate,
  executeCreateMany,
  executeUpdate,
  executeDelete,
  executeUpsert,
  executeUpsertMany,
} from "./ops/mutate";
import { executeTransaction } from "./ops/transaction";
import type {
  FindOptions,
  CreateOptions,
  CreateManyOptions,
  UpdateOptions,
  DeleteOptions,
  UpsertOptions,
  UpsertManyOptions,
  FindOneOptions,
  PgModelClientLike,
} from "./types";
import type {
  PgSelectResult,
  PgInsertResult,
  PgUpdateResult,
  PgDeleteResult,
} from "../types";

export class PgModelClient<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
> implements PgModelClientLike<T, Cols> {
  readonly accessor: ModelAccessor<Cols>;
  readonly _pool: Pool;
  readonly _conn: Pool | PoolClient;
  readonly _logger: QueryLogger | undefined;

  constructor(
    model: ModelDefinition,
    pool: Pool,
    conn?: PoolClient,
    logger?: QueryLogger,
  ) {
    this.accessor = new ModelAccessor<Cols>(model);
    this._pool = pool;
    this._conn = conn ?? pool;
    this._logger = logger ?? undefined;
  }

  async findMany(options: FindOptions<Cols> = {}): Promise<PgSelectResult<T>> {
    return executeFindMany<T, Cols>(this, options);
  }

  async findOne(
    options: FindOneOptions<Cols> = {},
  ): Promise<PgSelectResult<T>> {
    return executeFindOne<T, Cols>(this, options);
  }

  async create(options: CreateOptions<Cols>): Promise<PgInsertResult<T>> {
    return executeCreate<T, Cols>(this, options);
  }

  async createMany(
    options: CreateManyOptions<Cols>,
  ): Promise<PgInsertResult<T>> {
    return executeCreateMany<T, Cols>(this, options);
  }

  async update(options: UpdateOptions<Cols>): Promise<PgUpdateResult<T>> {
    return executeUpdate<T, Cols>(this, options);
  }

  async delete(options: DeleteOptions<Cols>): Promise<PgDeleteResult<T>> {
    return executeDelete<T, Cols>(this, options);
  }

  async upsert(options: UpsertOptions<Cols>): Promise<PgInsertResult<T>> {
    return executeUpsert<T, Cols>(this, options);
  }

  async upsertMany(
    options: UpsertManyOptions<Cols>,
  ): Promise<PgInsertResult<T>> {
    return executeUpsertMany<T, Cols>(this, options);
  }

  async transaction<R>(
    callback: (tx: PgModelClient<T, Cols>) => Promise<R>,
  ): Promise<R> {
    return executeTransaction<T, Cols, R>(
      this,
      callback as (tx: PgModelClientLike<T, Cols>) => Promise<R>,
    );
  }

  withClient(client: PoolClient): PgModelClient<T, Cols> {
    return new PgModelClient<T, Cols>(
      (this.accessor as any)._model,
      this._pool,
      client,
      this._logger,
    );
  }
}
