import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { ModelDefinition } from '@damatjs/orm-model';
import { ModelAccessor } from "../query";
import type { QueryLogger } from "../logger";
import { executeFindMany, executeFindOne } from "./ops/find";
import { executeCreate, executeCreateMany, executeUpdate, executeDelete, executeUpsert } from "./ops/mutate";
import { executeTransaction } from "./ops/transaction";
import type {
  FindOptions,
  CreateOptions,
  CreateManyOptions,
  UpdateOptions,
  DeleteOptions,
  UpsertOptions,
} from "../query";
import type {
  PgSelectResult,
  PgInsertResult,
  PgUpdateResult,
  PgDeleteResult,
} from "../types";

export class PgModelClient<
  T extends QueryResultRow = Record<string, unknown>,
  Cols extends string = string,
> {
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
    return executeFindMany(this as any, options);
  }

  async findOne(options: Omit<FindOptions<Cols>, "limit" | "offset"> = {}): Promise<PgSelectResult<T>> {
    return executeFindOne(this as any, options);
  }

  async create(options: CreateOptions<Cols>): Promise<PgInsertResult<T>> {
    return executeCreate(this as any, options);
  }

  async createMany(options: CreateManyOptions<Cols>): Promise<PgInsertResult<T>> {
    return executeCreateMany(this as any, options);
  }

  async update(options: UpdateOptions<Cols>): Promise<PgUpdateResult<T>> {
    return executeUpdate(this as any, options);
  }

  async delete(options: DeleteOptions<Cols>): Promise<PgDeleteResult<T>> {
    return executeDelete(this as any, options);
  }

  async upsert(options: UpsertOptions<Cols>): Promise<PgInsertResult<T>> {
    return executeUpsert(this as any, options);
  }

  async transaction<R>(callback: (tx: PgModelClient<T, Cols>) => Promise<R>): Promise<R> {
    return executeTransaction(this as any, callback);
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
