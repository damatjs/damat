import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { BuiltQuery, InsertDescriptor, UpsertDescriptor } from "../query";
import type { PgInsertResult } from "../types";
import { type QueryLogger } from "../logger";
import { pgExecuteRaw } from "./raw";

export async function pgInsert<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  descriptor: InsertDescriptor | UpsertDescriptor,
  logger?: QueryLogger,
): Promise<PgInsertResult<T>> {
  const { rows, rowCount } = await pgExecuteRaw<T>(conn, query, logger);
  return { rows, rowCount, descriptor };
}
