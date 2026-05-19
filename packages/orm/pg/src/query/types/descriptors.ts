import type {
  WhereConditionValue,
  RawWhereClause,
  OrderDirection,
} from "./clauses";

export type WhereConditionJson = {
  [column: string]: WhereConditionValue;
};

export interface OrderByJson {
  column: string;
  direction?: OrderDirection;
  nulls?: "NULLS FIRST" | "NULLS LAST";
}

export interface RelationDescriptor {
  relation: string;
  table: string;
  schema?: string;
  type: "belongsTo" | "hasMany" | "hasOne";
  foreignKey: string[];
  references: string[];
  columns: string[];
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  orderBy: OrderByJson[];
  limit?: number;
  offset?: number;
  with: RelationDescriptor[];
}

export interface SelectDescriptor {
  type: "select";
  table: string;
  schema?: string;
  columns: string[];
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  orderBy: OrderByJson[];
  limit?: number;
  offset?: number;
  distinct: boolean;
  with?: RelationDescriptor[];
}

export interface InsertDescriptor {
  type: "insert";
  table: string;
  schema?: string;
  rows: Record<string, unknown>[];
  onConflict?: {
    conflictColumns?: string[];
    action: "nothing" | "update";
    set?: Record<string, unknown>;
  };
  returning: string[];
}

export interface UpdateDescriptor {
  type: "update";
  table: string;
  schema?: string;
  set: Record<string, unknown>;
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  orderBy: OrderByJson[];
  returning: string[];
}

export interface DeleteDescriptor {
  type: "delete";
  table: string;
  schema?: string;
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  returning: string[];
}

export interface UpsertDescriptor {
  type: "upsert";
  table: string;
  schema?: string;
  rows: Record<string, unknown>[];
  conflictColumns: string[];
  updateColumns?: string[];
  set?: Record<string, unknown>;
  returning: string[];
}

export type QueryDescriptor =
  | SelectDescriptor
  | InsertDescriptor
  | UpdateDescriptor
  | DeleteDescriptor
  | UpsertDescriptor;
