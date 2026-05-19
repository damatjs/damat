import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { BuiltQuery, UpdateDescriptor } from "../query";
import type { PgUpdateResult } from "../types";
import { type QueryLogger } from "../logger";
import { pgExecuteRaw } from "./raw";

export async function pgUpdate<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  descriptor: UpdateDescriptor,
  logger?: QueryLogger,
): Promise<PgUpdateResult<T>> {
  const { rows, rowCount } = await pgExecuteRaw<T>(conn, query, logger);
  return { rows, rowCount, descriptor };
}
