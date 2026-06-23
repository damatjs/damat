import { ModelDefinition } from "@damatjs/orm-model";
import { z } from "@damatjs/deps/zod";
import { QueryResultRow } from "@damatjs/orm-type";

export type ModelsMap = Record<string, ModelDefinition>;
export type TypesMap = Record<string, QueryResultRow>;

export interface FindOptions<Cols extends string = string> {
  select?: Cols[];
  where?: Record<string, unknown>;
  orderBy?: Array<{ column: Cols; direction?: "ASC" | "DESC" }>;
  skip?: number;
  take?: number;
  include?: string[];
}

export interface CreateOptions<TData = Record<string, unknown>> {
  data: TData;
  returning?: string[];
}

export interface CreateManyOptions<TData = Record<string, unknown>> {
  data: TData[];
  returning?: string[];
}

export interface UpdateOptions<TData = Record<string, unknown>> {
  where: Record<string, unknown>;
  data: TData;
  returning?: string[];
}

export interface UpsertOptions<TData = Record<string, unknown>> {
  /** The row to insert or update. */
  data: TData;
  /** Unique-constraint column(s) that define the conflict target. */
  onConflict: string[];
  /** Columns to update on conflict. Defaults to every inserted non-conflict column. */
  updateColumns?: string[];
  /** Explicit column → value overrides for the `DO UPDATE SET` clause. */
  set?: Record<string, unknown>;
  returning?: string[];
}

export interface UpsertManyOptions<TData = Record<string, unknown>> {
  /** The rows to insert or update. */
  data: TData[];
  /** Unique-constraint column(s) that define the conflict target. */
  onConflict: string[];
  /** Columns to update on conflict. Defaults to every inserted non-conflict column. */
  updateColumns?: string[];
  /** Explicit column → value overrides for the `DO UPDATE SET` clause. */
  set?: Record<string, unknown>;
  returning?: string[];
}

export interface DeleteOptions {
  where: Record<string, unknown>;
  returning?: string[];
  /**
   * When true, recursively delete the rows reachable through `hasMany`/`hasOne`
   * relations before deleting the matched rows, all inside one transaction.
   * Each relation's `rule.onDelete` is respected (CASCADE/SET NULL/RESTRICT).
   */
  cascade?: boolean;
}

export interface SoftDeleteOptions {
  where: Record<string, unknown>;
  returning?: string[];
  /**
   * When true, recursively soft-delete the rows reachable through
   * `hasMany`/`hasOne` relations before soft-deleting the matched rows, all
   * inside one transaction.
   */
  cascade?: boolean;
}

export interface CountOptions {
  where?: Record<string, unknown>;
}

export interface ExistsOptions {
  where: Record<string, unknown>;
}

export interface ModuleServiceConfig<
  TModels extends ModelsMap = ModelsMap,
  TCredentialsSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  TTypes extends TypesMap | undefined = undefined,
> {
  models: TModels;
  credentialsSchema?: TCredentialsSchema;
  types?: TTypes;
}

export type ToCamelCase<S extends string> =
  S extends `${infer First}${infer Rest}` ? `${Lowercase<First>}${Rest}` : S;
