import type { ColumnSchema } from "@damatjs/orm-type";
import type {
  WhereOperators,
  WhereConditionValue,
  WhereClause,
  RawWhereClause,
  OrderDirection,
  OrderByClause,
  BuiltQuery,
} from "@damatjs/orm-type";

export type {
  WhereOperators,
  WhereConditionValue,
  WhereClause,
  RawWhereClause,
  OrderDirection,
  OrderByClause,
  BuiltQuery,
};

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
