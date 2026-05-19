import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { BuiltQuery, SelectDescriptor } from "../query";
import type { PgSelectResult } from "../types";
import { type QueryLogger } from "../logger";
import { pgExecuteRaw } from "./raw";

export async function pgSelect<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  descriptor: SelectDescriptor,
  logger?: QueryLogger,
): Promise<PgSelectResult<T>> {
  const { rows, rowCount } = await pgExecuteRaw<T>(conn, query, logger);
  return { rows, rowCount, descriptor };
}
