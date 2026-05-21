import type { QueryResultRow } from "@damatjs/deps/pg";
import type {
  DeleteDescriptor,
  InsertDescriptor,
  SelectDescriptor,
  UpdateDescriptor,
  UpsertDescriptor,
} from "../query/types";

export interface PgSelectResult<
  T extends QueryResultRow = Record<string, unknown>,
> {
  rows: T[];
  rowCount: number;
  descriptor: SelectDescriptor;
}

export interface PgInsertResult<
  T extends QueryResultRow = Record<string, unknown>,
> {
  rows: T[];
  rowCount: number;
  descriptor: InsertDescriptor | UpsertDescriptor;
}

export interface PgUpdateResult<
  T extends QueryResultRow = Record<string, unknown>,
> {
  rows: T[];
  rowCount: number;
  descriptor: UpdateDescriptor;
}

export interface PgDeleteResult<
  T extends QueryResultRow = Record<string, unknown>,
> {
  rows: T[];
  rowCount: number;
  descriptor: DeleteDescriptor;
}

export type PgQueryResult<T extends QueryResultRow = Record<string, unknown>> =
  | PgSelectResult<T>
  | PgInsertResult<T>
  | PgUpdateResult<T>
  | PgDeleteResult<T>;
