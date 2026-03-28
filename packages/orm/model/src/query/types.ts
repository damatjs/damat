import { ColumnSchema } from "@/types";
import { ColumnBuilder } from "@/properties/column/base";
import { BelongsToBuilder } from "@/properties/relation/belongsToBuilder";

// ─── Extract column schemas from a ModelDefinition ───────────────────────────
//
// The goal: given a ModelDefinition, derive compile-time types for column
// names, column value types, nullable columns, required columns, etc.
//
// Because ModelDefinition._properties is Record<string, PropertyValue> and
// PropertyValue = ColumnBuilder | BelongsToBuilder | HasManyBuilder | HasOneBuilder,
// we can't drill into the exact column names / TS types purely at the type level
// without a codegen step.  What we CAN do is:
//
//   1. Carry the resolved ColumnSchema[] (runtime) into all builders via the
//      ModelDefinition reference itself, so every builder has full column
//      metadata and can validate names + types at runtime.
//
//   2. Expose a generic type parameter `Cols extends string` on each builder
//      so that callers who DO know the column names (e.g. from codegen'd
//      types) can narrow `.select(["id","email"])` to be type-safe.
//      When the type parameter is left as `string`, TypeScript falls back to
//      accepting any string — identical to today's behaviour.
//
// This gives us the best of both worlds:
//   - Works perfectly with or without codegen
//   - With codegen, `new SelectBuilder<keyof UserRow>(UserSchema)` is fully
//     typed — wrong column names are compile errors
//   - Without codegen, runtime validation still catches bad names

// ─── Column name union helpers ────────────────────────────────────────────────

/**
 * Compute the union of all column names from a `ColumnSchema[]`.
 *
 * @example
 * ```ts
 * type UserCols = ColumnNameUnion<typeof userColumns>;
 * // → "id" | "email" | "name" | "age" | "verified" | "created_at" | "updated_at"
 * ```
 */
export type ColumnNameUnion<T extends ColumnSchema[]> = T[number]["name"];

// ─── Column → TS value type mapping ─────────────────────────────────────────

/**
 * Map a `ColumnSchema` to the TypeScript value type that should be used when
 * writing to that column (INSERT / UPDATE).
 *
 * - nullable columns allow `null`
 * - array columns wrap in `Array<…>`
 * - auto-increment / default-only columns are never required from callers
 */
export type ColumnWriteType<C extends ColumnSchema> = C["nullable"] extends true
  ? ColumnBaseType<C> | null
  : ColumnBaseType<C>;

/**
 * Base write type for a column (without nullability).
 * Mapped from the ColumnType string — covers the most common cases.
 */
export type ColumnBaseType<C extends ColumnSchema> = C["type"] extends
  | "integer"
  | "bigint"
  | "smallint"
  | "serial"
  | "bigserial"
  | "smallserial"
  | "numeric"
  | "decimal"
  | "real"
  | "double precision"
  | "money"
  ? number
  : C["type"] extends "boolean"
    ? boolean
    : C["type"] extends "json" | "jsonb"
      ? unknown
      : C["type"] extends
            | "date"
            | "timestamp without time zone"
            | "timestamp with time zone"
            | "time without time zone"
            | "time with time zone"
            | "interval"
        ? Date | string
        : string;

// ─── ValuesMap — typed INSERT / UPDATE payload ────────────────────────────────

/**
 * A map of column-name → value for INSERT rows or UPDATE SET clauses.
 *
 * When `Cols extends string` is left as the default (`string`), this behaves
 * as `Record<string, unknown>` and any key is accepted.
 *
 * When narrowed (e.g. via codegen or explicit generic), only valid column
 * names are accepted and values are typed.
 */
export type ValuesMap<Cols extends string = string> = {
  [K in Cols]?: unknown;
};

// ─── WhereClause — typed WHERE predicate ─────────────────────────────────────

/**
 * Operators supported in the object-style `.where()` API.
 *
 * Combine multiple operators on the same column:
 * ```ts
 * .where({ age: { gt: 18, lte: 65 } })
 * .where({ status: { in: ["active", "pending"] } })
 * ```
 */
export type WhereOperators =
  | { eq: unknown }
  | { neq: unknown }
  | { gt: unknown }
  | { gte: unknown }
  | { lt: unknown }
  | { lte: unknown }
  | { like: string }
  | { ilike: string }
  | { in: unknown[] }
  | { notIn: unknown[] }
  | { isNull: true }
  | { isNotNull: true }
  | { between: [unknown, unknown] };

/** A single column condition: either a plain value (equality) or an operator object. */
export type WhereConditionValue = unknown | WhereOperators;

/**
 * Object-style WHERE clause keyed by column name.
 *
 * When `Cols` is narrowed, only valid column names are accepted as keys.
 */
export type WhereClause<Cols extends string = string> = {
  [K in Cols]?: WhereConditionValue;
};

/**
 * A raw SQL fragment with its own positional parameters.
 *
 * Parameters inside `sql` must be numbered from `$1` — they are
 * automatically re-numbered at build time to avoid clashes.
 *
 * @example
 * ```ts
 * { sql: "created_at > now() - interval $1", params: ["30 days"] }
 * ```
 */
export interface RawWhereClause {
  sql: string;
  params?: unknown[];
}

// ─── ORDER BY ─────────────────────────────────────────────────────────────────

export type OrderDirection = "ASC" | "DESC";

export interface OrderByClause {
  column: string;
  direction?: OrderDirection;
  nulls?: "NULLS FIRST" | "NULLS LAST";
}

// ─── The final output of every builder ───────────────────────────────────────

/**
 * The result of calling `.generateSql()` on any query builder.
 *
 * A separate execution layer consumes this — the builders themselves never
 * touch a database connection.
 *
 * @example
 * ```ts
 * const q = new SelectBuilder(UserSchema)
 *   .columns(["id", "email"])
 *   .where({ verified: true })
 *   .generateSql();
 *
 * // q.sql    → SELECT "id", "email" FROM "store"."user" WHERE "verified" = $1
 * // q.params → [true]
 * ```
 */
export interface BuiltQuery {
  /** Fully parameterised SQL — use $1, $2, … positional placeholders. */
  sql: string;
  /** Values corresponding to each $N placeholder, in order. */
  params: unknown[];
}

// ─── QueryDescriptor — structured JSON representation ─────────────────────────
//
// A serialisable, database-agnostic description of a query.
// Every builder produces one of these via `.generateJson()`.
// The discriminant field `type` lets downstream code switch on the operation.

/** WHERE condition in JSON form — parallel to WhereClause but fully serialisable. */
export type WhereConditionJson = {
  [column: string]: WhereConditionValue;
};

/** ORDER BY entry in JSON form. */
export interface OrderByJson {
  column: string;
  direction?: OrderDirection;
  nulls?: "NULLS FIRST" | "NULLS LAST";
}

/**
 * JSON descriptor for a `SELECT` query.
 *
 * @example
 * ```ts
 * {
 *   type: "select",
 *   table: "user",
 *   schema: "store",
 *   columns: ["id", "email"],
 *   where: [{ verified: true }],
 *   orderBy: [{ column: "name", direction: "ASC" }],
 *   limit: 10,
 *   offset: 0,
 *   distinct: false,
 * }
 * ```
 */
/**
 * JSON descriptor for a relation include in a query.
 * Used in SelectDescriptor to represent nested relation loading.
 */
export interface RelationDescriptor {
  /** The relation property name on the parent model. */
  relation: string;

  /** The target table name. */
  table: string;

  /** The target table schema (if any). */
  schema?: string;

  /** Relation type: belongsTo, hasMany, or hasOne. */
  type: "belongsTo" | "hasMany" | "hasOne";

  /** The FK column(s) that link parent to child. */
  foreignKey: string[];

  /** The referenced column(s) on the target table. */
  references: string[];

  /** Columns to select from the related table. */
  columns: string[];

  /** WHERE conditions for the related rows. */
  where: WhereConditionJson[];

  /** Raw WHERE fragments. */
  whereRaw: RawWhereClause[];

  /** ORDER BY clauses. */
  orderBy: OrderByJson[];

  /** LIMIT for the relation (hasMany only). */
  limit?: number;

  /** OFFSET for the relation (hasMany only). */
  offset?: number;

  /** Nested relation includes. */
  with: RelationDescriptor[];
}

export interface SelectDescriptor {
  type: "select";
  table: string;
  schema?: string;
  /** Columns to return — empty means all columns (`SELECT *`). */
  columns: string[];
  where: WhereConditionJson[];
  /** Raw SQL WHERE fragments (not serialisable to safe JSON — preserved as-is). */
  whereRaw: RawWhereClause[];
  orderBy: OrderByJson[];
  limit?: number;
  offset?: number;
  distinct: boolean;
  /** Relations to include with the query (Drizzle-style nested loading). */
  with?: RelationDescriptor[];
}

/**
 * JSON descriptor for an `INSERT` query.
 *
 * @example
 * ```ts
 * {
 *   type: "insert",
 *   table: "user",
 *   schema: "store",
 *   rows: [{ id: "usr_1", email: "a@b.com" }],
 *   onConflict: { conflictColumns: ["email"], action: "update", set: { name: "Alice" } },
 *   returning: ["id"],
 * }
 * ```
 */
export interface InsertDescriptor {
  type: "insert";
  table: string;
  schema?: string;
  /** One entry per row to insert. */
  rows: Record<string, unknown>[];
  onConflict?: {
    conflictColumns?: string[];
    action: "nothing" | "update";
    set?: Record<string, unknown>;
  };
  /** Columns to return — empty means `RETURNING *`. */
  returning: string[];
}

/**
 * JSON descriptor for an `UPDATE` query.
 *
 * @example
 * ```ts
 * {
 *   type: "update",
 *   table: "user",
 *   schema: "store",
 *   set: { name: "Alice", verified: true },
 *   where: [{ id: "usr_1" }],
 *   returning: ["id", "name"],
 * }
 * ```
 */
export interface UpdateDescriptor {
  type: "update";
  table: string;
  schema?: string;
  /** Column → value pairs to apply. */
  set: Record<string, unknown>;
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  orderBy: OrderByJson[];
  /** Columns to return — empty means `RETURNING *`. */
  returning: string[];
}

/**
 * JSON descriptor for a `DELETE` query.
 *
 * @example
 * ```ts
 * {
 *   type: "delete",
 *   table: "user",
 *   schema: "store",
 *   where: [{ id: "usr_1" }],
 *   returning: ["id"],
 * }
 * ```
 */
export interface DeleteDescriptor {
  type: "delete";
  table: string;
  schema?: string;
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  /** Columns to return — empty means `RETURNING *`. */
  returning: string[];
}

/**
 * Discriminated union of all four query descriptor types.
 * Switch on `.type` to handle each case.
 *
 * @example
 * ```ts
 * const json = new SelectBuilder(UserSchema).columns(["id"]).generateJson();
 * switch (json.type) {
 *   case "select": ...
 *   case "insert": ...
 * }
 * ```
 */
export type QueryDescriptor =
  | SelectDescriptor
  | InsertDescriptor
  | UpdateDescriptor
  | DeleteDescriptor;

// ─── Re-export ColumnSchema / ColumnBuilder for base class usage ─────────────
export type { ColumnSchema, ColumnBuilder, BelongsToBuilder };
