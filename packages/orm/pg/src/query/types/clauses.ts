import type { ColumnSchema } from '@damatjs/orm-type';

export type ColumnNameUnion<T extends ColumnSchema[]> = T[number]["name"];

export type ColumnWriteType<C extends ColumnSchema> = C["nullable"] extends true
  ? ColumnBaseType<C> | null
  : ColumnBaseType<C>;

export type ColumnBaseType<C extends ColumnSchema> = C["type"] extends
  | "integer" | "bigint" | "smallint" | "serial" | "bigserial" | "smallserial"
  | "numeric" | "decimal" | "real" | "double precision" | "money"
  ? number
  : C["type"] extends "boolean"
  ? boolean
  : C["type"] extends "json" | "jsonb"
  ? unknown
  : C["type"] extends
  | "date" | "timestamp without time zone" | "timestamp with time zone"
  | "time without time zone" | "time with time zone" | "interval"
  ? Date | string
  : string;

export type ValuesMap<Cols extends string = string> = {
  [K in Cols]?: unknown;
};

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

export type WhereConditionValue = unknown | WhereOperators;

export type WhereClause<Cols extends string = string> = {
  [K in Cols]?: WhereConditionValue;
};

export interface RawWhereClause {
  sql: string;
  params?: unknown[];
}

export type OrderDirection = "ASC" | "DESC";

export interface OrderByClause {
  column: string;
  direction?: OrderDirection;
  nulls?: "NULLS FIRST" | "NULLS LAST";
}

export interface BuiltQuery {
  sql: string;
  params: unknown[];
}
