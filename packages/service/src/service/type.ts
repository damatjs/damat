import { ModelDefinition } from "@damatjs/orm-model";
import { z } from "@damatjs/deps/zod";
import { QueryResultRow } from "@damatjs/orm-type";

export type ModelsMap = Record<string, ModelDefinition>;
export type TypesMap = Record<string, QueryResultRow>;

/**
 * Per-call opt-in read caching (the Next.js fetch-cache model). Only honored
 * when the service was created with `cache` in its config AND Redis is
 * initialized — otherwise the read goes straight to the database. `true`
 * uses the service's default TTL.
 */
export interface CacheReadOptions {
  /** Time to live in seconds (default: the service config's defaultTtl, 60). */
  ttl?: number;
  /**
   * Extra invalidation tags for this entry. Every entry always carries the
   * implicit `model:<name>` tag, which writes to the model invalidate
   * automatically; custom tags are invalidated via `invalidateCacheTags()`.
   */
  tags?: string[];
}

/** Service-level switch that enables the read-cache machinery (opt-in). */
export interface ServiceCacheConfig {
  /** Default TTL in seconds for `cache: true` reads (default: 60). */
  defaultTtl?: number;
  /** Cache-key namespace, e.g. the module id (default: "svc"). */
  prefix?: string;
}

export interface FindOptions<Cols extends string = string> {
  select?: Cols[];
  where?: Record<string, unknown>;
  orderBy?: Array<{
    column: Cols;
    direction?: "ASC" | "DESC";
    nulls?: "NULLS FIRST" | "NULLS LAST";
  }>;
  /** Rows to skip (maps to SQL OFFSET). Must be a non-negative integer. */
  skip?: number;
  /** Max rows to return (maps to SQL LIMIT, capped at {@link MAX_PAGE_SIZE}). */
  take?: number;
  include?: string[];
  /**
   * Include soft-deleted rows. By default every read on a soft-delete model
   * filters `deleted_at IS NULL`; set this to see archived rows too.
   */
  withDeleted?: boolean;
  /** Opt into Redis read caching for this call (see {@link CacheReadOptions}). */
  cache?: boolean | CacheReadOptions;
}

/**
 * Hard upper bound on `take`. A caller may request fewer, but never more —
 * this is the guard against an untrusted `take` triggering a full-table scan.
 */
export const MAX_PAGE_SIZE = 1000;

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
  /** Count soft-deleted rows too (default: only `deleted_at IS NULL`). */
  withDeleted?: boolean;
  /** Opt into Redis read caching for this call (see {@link CacheReadOptions}). */
  cache?: boolean | CacheReadOptions;
}

export interface ExistsOptions {
  where: Record<string, unknown>;
  /** Consider soft-deleted rows too (default: only `deleted_at IS NULL`). */
  withDeleted?: boolean;
  /** Opt into Redis read caching for this call (see {@link CacheReadOptions}). */
  cache?: boolean | CacheReadOptions;
}

export interface ModuleServiceConfig<
  TModels extends ModelsMap = ModelsMap,
  TCredentialsSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  TTypes extends TypesMap | undefined = undefined,
> {
  models: TModels;
  credentialsSchema?: TCredentialsSchema;
  types?: TTypes;
  /**
   * Emit one debug-level `query` log ({ model, method, durationMs }) per CRUD
   * call. Off by default; no SQL text or parameter values are ever logged.
   */
  logQueries?: boolean;
  /**
   * Enable the opt-in Redis read cache for this service's models. Reads are
   * only cached when the individual call also passes a `cache` option; writes
   * (create/update/delete/…) then invalidate the model's cached reads
   * automatically. Requires an initialized Redis (reads fall through to the
   * database when it is missing or down).
   */
  cache?: ServiceCacheConfig;
  /**
   * Emit `<model>.created|updated|deleted` on the global event bus
   * (@damatjs/events) after every successful write. Off by default.
   */
  events?: boolean;
}

export type ToCamelCase<S extends string> =
  S extends `${infer First}${infer Rest}` ? `${Lowercase<First>}${Rest}` : S;
