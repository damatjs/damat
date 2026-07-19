import type { DatabaseClient, DatabaseClientFactory } from "../../database";

export const pgError = (code: string) =>
  Object.assign(new Error(code), { code });

export interface ClientPlan {
  connectError?: unknown;
  rows?: unknown[];
  createError?: unknown;
}

export function clients(plans: ClientPlan[]) {
  const urls: string[] = [];
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  let ends = 0;
  const factory: DatabaseClientFactory = async (url) => {
    urls.push(url);
    const plan = plans.shift() ?? {};
    return {
      connect: async () => {
        if (plan.connectError) throw plan.connectError;
      },
      query: async (sql: string, values?: unknown[]) => {
        queries.push({ sql, values });
        if (sql.startsWith("CREATE") && plan.createError) {
          throw plan.createError;
        }
        return { rows: plan.rows ?? [] };
      },
      end: async () => {
        ends++;
      },
    } satisfies DatabaseClient;
  };
  return { factory, urls, queries, ends: () => ends };
}
