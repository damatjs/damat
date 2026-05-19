import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { LoggerInterface } from "../core/types";
import { ModelAccessor } from "../query/accessor/modelAccessor";
import type {
  FindOptions,
  CreateOptions,
  CreateManyOptions,
  UpdateOptions,
  DeleteOptions,
  UpsertOptions,
} from "../query/accessor/type";
import type { PgSelectResult } from "../types";
import { pgSelect, pgInsert, pgUpdate, pgDelete } from "../executor";
import type {
  SelectDescriptor,
  InsertDescriptor,
  UpdateDescriptor,
  DeleteDescriptor,
} from "../query/types";
import type { UpsertDescriptor } from "../query/types";

export interface PgRepositoryConfig {
  model: ModelDefinition;
  connection: Pool | PoolClient;
  logger: LoggerInterface;
  isInTransaction?: boolean;
}

export class PgRepository<T extends QueryResultRow = QueryResultRow> {
  protected accessor: ModelAccessor;
  protected connection: Pool | PoolClient;
  protected logger: LoggerInterface;
  protected isInTransaction: boolean;

  constructor(config: PgRepositoryConfig) {
    this.accessor = new ModelAccessor(config.model);
    this.connection = config.connection;
    this.logger = config.logger;
    this.isInTransaction = config.isInTransaction ?? false;
  }

  async findMany(
    options: FindOptions<string> = {}
  ): Promise<PgSelectResult<T>> {
    const { sql, json } = this.accessor.findMany(options);
    this._logQuery(sql.sql, sql.params);
    return pgSelect<T>(this.connection, sql, json as SelectDescriptor);
  }

  async findOne(
    options: Omit<FindOptions<string>, "limit" | "offset"> = {}
  ): Promise<T | undefined> {
    const { sql, json } = this.accessor.findOne(options);
    this._logQuery(sql.sql, sql.params);
    const result = await pgSelect<T>(this.connection, sql, json as SelectDescriptor);
    return result.rows[0];
  }

  async findById(id: string, options: Omit<FindOptions<string>, "where"> = {}): Promise<T | undefined> {
    const opts: FindOptions<string> = { ...options, where: { id } };
    const { sql, json } = this.accessor.findOne(opts);
    this._logQuery(sql.sql, sql.params);
    const result = await pgSelect<T>(this.connection, sql, json as SelectDescriptor);
    return result.rows[0];
  }

  async findManyByIds(
    ids: string[],
    options: Omit<FindOptions<string>, "where"> = {}
  ): Promise<PgSelectResult<T>> {
    const opts: FindOptions<string> = { ...options, where: { id: { in: ids } } };
    const { sql, json } = this.accessor.findMany(opts);
    this._logQuery(sql.sql, sql.params);
    return pgSelect<T>(this.connection, sql, json as SelectDescriptor);
  }

  async create(options: CreateOptions<string>): Promise<T> {
    const { sql, json } = this.accessor.create(options);
    this._logQuery(sql.sql, sql.params);
    const result = await pgInsert<T>(this.connection, sql, json as InsertDescriptor);
    if (!result.rows[0]) {
      throw new Error("Failed to create record: no rows returned");
    }
    return result.rows[0];
  }

  async createMany(options: CreateManyOptions<string>): Promise<T[]> {
    const { sql, json } = this.accessor.createMany(options);
    this._logQuery(sql.sql, sql.params);
    const result = await pgInsert<T>(this.connection, sql, json as InsertDescriptor);
    return result.rows;
  }

  async update(options: UpdateOptions<string>): Promise<T[]> {
    const { sql, json } = this.accessor.update(options);
    this._logQuery(sql.sql, sql.params);
    const result = await pgUpdate<T>(this.connection, sql, json as UpdateDescriptor);
    return result.rows;
  }

  async updateOne(
    set: Record<string, unknown>,
    where: Record<string, unknown>,
    returning?: string[]
  ): Promise<T | undefined> {
    const opts: UpdateOptions<string> = { set, where };
    if (returning) opts.returning = returning;
    const { sql, json } = this.accessor.update(opts);
    this._logQuery(sql.sql, sql.params);
    const result = await pgUpdate<T>(this.connection, sql, json as UpdateDescriptor);
    return result.rows[0];
  }

  async delete(options: DeleteOptions<string>): Promise<number> {
    const { sql, json } = this.accessor.delete(options);
    this._logQuery(sql.sql, sql.params);
    const result = await pgDelete<T>(this.connection, sql, json as DeleteDescriptor);
    return result.rowCount;
  }

  async deleteById(id: string, returning?: string[]): Promise<T | undefined> {
    const opts: DeleteOptions<string> = { where: { id } };
    if (returning) opts.returning = returning;
    const { sql, json } = this.accessor.delete(opts);
    this._logQuery(sql.sql, sql.params);
    const result = await pgDelete<T>(this.connection, sql, json as DeleteDescriptor);
    return result.rows[0];
  }

  async upsert(options: UpsertOptions<string>): Promise<T> {
    const { sql, json } = this.accessor.upsert(options);
    this._logQuery(sql.sql, sql.params);
    const result = await pgInsert<T>(this.connection, sql, json as unknown as UpsertDescriptor);
    if (!result.rows[0]) {
      throw new Error("Upsert failed: no rows returned");
    }
    return result.rows[0];
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    const opts: FindOptions<string> = { select: [] };
    if (where) opts.where = where;
    const { sql } = this.accessor.findMany(opts);
    
    const countSql = `SELECT COUNT(*) FROM (${sql.sql}) as subquery`;
    this._logQuery(countSql, sql.params);
    
    const result = await this.connection.query<{ count: string }>(
      countSql,
      sql.params
    );
    
    return parseInt(result.rows[0]?.count || "0", 10);
  }

  async exists(where: Record<string, unknown>): Promise<boolean> {
    const { sql } = this.accessor.findOne({ where });
    
    const existsSql = `SELECT EXISTS(${sql.sql}) as exists`;
    this._logQuery(existsSql, sql.params);
    
    const result = await this.connection.query<{ exists: boolean }>(
      existsSql,
      sql.params
    );
    
    return result.rows[0]?.exists ?? false;
  }

  getAccessor(): ModelAccessor {
    return this.accessor;
  }

  private _logQuery(sql: string, params?: unknown[]): void {
    this.logger.debug("Executing query", {
      sql: sql.substring(0, 200),
      paramCount: params?.length ?? 0,
      inTransaction: this.isInTransaction,
    });
  }
}

export function createRepository<T extends QueryResultRow = QueryResultRow>(
  model: ModelDefinition,
  connection: Pool | PoolClient | { getPool: () => Pool },
  logger: LoggerInterface,
  isInTransaction: boolean = false
): PgRepository<T> {
  let conn: Pool | PoolClient;
  
  if ("getPool" in connection) {
    conn = connection.getPool();
    isInTransaction = false;
  } else {
    conn = connection;
  }
  
  return new PgRepository<T>({
    model,
    connection: conn,
    logger,
    isInTransaction,
  });
}
