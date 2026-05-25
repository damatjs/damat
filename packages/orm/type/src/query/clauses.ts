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
