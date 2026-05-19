import { pgSelect } from "../../executor";
import type { SelectDescriptor } from "../../query";
import type { PgSelectResult } from "../../types";

export async function executeFindMany(client: any, options: any): Promise<PgSelectResult<any>> {
  const { sql, json } = client.accessor.findMany(options);
  return pgSelect(client._conn, sql, json as SelectDescriptor, client._logger);
}

export async function executeFindOne(client: any, options: any): Promise<PgSelectResult<any>> {
  const { sql, json } = client.accessor.findOne(options);
  return pgSelect(client._conn, sql, json as SelectDescriptor, client._logger);
}
