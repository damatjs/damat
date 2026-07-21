import type { ModelDefinition } from "@damatjs/orm-model";
import type { OrderDirection, WhereClause, RawWhereClause } from "../types";

export interface RelationIncludeOptions<Cols extends string = string> {
  select?: Cols[];
  where?: WhereClause<Cols>;
  whereRaw?: RawWhereClause | RawWhereClause[];
  orderBy?: Array<{
    column: Cols;
    direction?: OrderDirection;
    nulls?: "NULLS FIRST" | "NULLS LAST";
  }>;
  limit?: number;
  offset?: number;
  with?: RelationIncludeMap;
}

export interface RelationIncludeMap {
  [relationName: string]: RelationIncludeOptions | boolean;
}

export interface RelationIncludeDescriptor {
  relation: string;
  table: string;
  schema?: string;
  type: "belongsTo" | "hasMany" | "hasOne";
  foreignKey: string[];
  references: string[];
  columns: string[];
  where: Array<{ [column: string]: unknown }>;
  whereRaw: RawWhereClause[];
  orderBy: Array<{
    column: string;
    direction?: OrderDirection;
    nulls?: "NULLS FIRST" | "NULLS LAST";
  }>;
  limit?: number;
  offset?: number;
  with: RelationIncludeDescriptor[];
}

export interface ResolvedRelation {
  name: string;
  type: "belongsTo" | "hasMany" | "hasOne";
  target: ModelDefinition;
  foreignKey: string[];
  references: string[];
}

export interface LateralJoinConfig {
  relation: ResolvedRelation;
  parentAlias: string;
  options: RelationIncludeOptions;
  paramOffset: number;
}

export interface LateralJoinResult {
  sql: string;
  params: unknown[];
  alias: string;
  nested: LateralJoinResult[];
}
