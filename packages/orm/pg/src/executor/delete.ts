import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { BuiltQuery, DeleteDescriptor } from "../query";
import type { PgDeleteResult } from "../types";
import { type QueryLogger } from "../logger";
import { pgExecuteRaw } from "./raw";

export async function pgDelete<
  T extends QueryResultRow = Record<string, unknown>,
>(
  conn: Pool | PoolClient,
  query: BuiltQuery,
  descriptor: DeleteDescriptor,
  logger?: QueryLogger,
): Promise<PgDeleteResult<T>> {
  const { rows, rowCount } = await pgExecuteRaw<T>(conn, query, logger);
  return { rows, rowCount, descriptor };
}
