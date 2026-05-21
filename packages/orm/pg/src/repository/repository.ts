import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { LoggerInterface } from "../types";
import { PgModelClient } from "../client";
import type { FindOptions, CreateOptions, CreateManyOptions, UpdateOptions, DeleteOptions, UpsertOptions } from "../query";

export interface PgRepositoryConfig {
  model: ModelDefinition;
  connection: Pool | PoolClient;
  logger: LoggerInterface;
  isInTransaction?: boolean;
}

export class PgRepository<T extends QueryResultRow = QueryResultRow, Cols extends string = string> {
  protected connection: Pool | PoolClient;
  protected logger: LoggerInterface;
  protected isInTransaction: boolean;
  public readonly client: PgModelClient<T, Cols>;

  constructor(config: PgRepositoryConfig) {
    this.connection = config.connection;
    this.logger = config.logger;
    this.isInTransaction = config.isInTransaction ?? false;
    this.client = new PgModelClient<T, Cols>(config.model, config.connection as Pool, config.connection as PoolClient);
  }

  async findMany(opt: FindOptions<Cols> = {}): Promise<any> { return this.client.findMany(opt); }
  async findOne(opt: Omit<FindOptions<Cols>, "limit" | "offset"> = {}): Promise<T | undefined> { return (await this.client.findOne(opt)).rows[0]; }
  async findById(id: string, opt: Omit<FindOptions<Cols>, "where"> = {}): Promise<T | undefined> { return this.findOne({ ...opt, where: { id } as any }); }
  async findManyByIds(ids: string[], opt: Omit<FindOptions<Cols>, "where"> = {}): Promise<any> { return this.client.findMany({ ...opt, where: { id: { in: ids } } as any }); }

  async create(opt: CreateOptions<Cols>): Promise<T> {
    const res = await this.client.create(opt);
    if (!res.rows[0]) throw new Error("Failed to create record: no rows returned");
    return res.rows[0];
  }

  async createMany(opt: CreateManyOptions<Cols>): Promise<T[]> { return (await this.client.createMany(opt)).rows; }
  async update(opt: UpdateOptions<Cols>): Promise<T[]> { return (await this.client.update(opt)).rows; }
  async updateOne(set: Record<string, unknown>, where: Record<string, unknown>, returning?: string[]): Promise<T | undefined> {
    return (await this.client.update({ set, where, returning } as any)).rows[0];
  }

  async delete(opt: DeleteOptions<Cols>): Promise<number> { return (await this.client.delete(opt)).rowCount; }
  async deleteById(id: string, returning?: string[]): Promise<T | undefined> { return (await this.client.delete({ where: { id } as any, returning } as any)).rows[0]; }

  async upsert(opt: UpsertOptions<Cols>): Promise<T> {
    const res = await this.client.upsert(opt);
    if (!res.rows[0]) throw new Error("Upsert failed: no rows returned");
    return res.rows[0];
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    const { sql } = this.client.accessor.findMany({ select: [] as any, where } as any);
    const result = await this.connection.query<{ count: string }>(`SELECT COUNT(*) FROM (${sql.sql}) as subquery`, sql.params as any[]);
    return parseInt(result.rows[0]?.count || "0", 10);
  }

  async exists(where: Record<string, unknown>): Promise<boolean> {
    const { sql } = this.client.accessor.findOne({ where } as any);
    const result = await this.connection.query<{ exists: boolean }>(`SELECT EXISTS(${sql.sql}) as exists`, sql.params as any[]);
    return result.rows[0]?.exists ?? false;
  }

  getAccessor() { return this.client.accessor; }
}
