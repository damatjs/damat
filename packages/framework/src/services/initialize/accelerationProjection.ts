import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import type { QueryResultRow } from "@damatjs/deps/pg";
import type { Redis } from "@damatjs/redis";

interface ReadyRow extends QueryResultRow {
  id: string;
  scope: string;
  available_at: Date;
}

export async function rebuildReadyProjection(
  redis: Redis,
  enabled: { jobs: boolean; events: boolean },
  executor: DurabilityExecutor = getDurabilityClient(),
): Promise<void> {
  await clearReadyKeys(redis);
  if (enabled.jobs) {
    const jobs = await executor.query<ReadyRow>(
      `SELECT "id","queue" AS "scope","available_at" FROM "_damat_job_runs"
       WHERE "status" IN ('queued','retry_wait')`,
    );
    for (const row of jobs.rows) {
      await redis.zadd(`damat:ready:jobs:${row.scope}`, row.available_at.getTime(), row.id);
    }
  }
  if (enabled.events) await rebuildEventProjection(redis, executor);
}

async function rebuildEventProjection(
  redis: Redis,
  executor: DurabilityExecutor,
): Promise<void> {
  const routes = await executor.query<ReadyRow>(
    `SELECT "id",'router' AS "scope","available_at"
     FROM "_damat_event_outbox" WHERE "routed_at" IS NULL`,
  );
  const deliveries = await executor.query<ReadyRow>(
    `SELECT d."id",json_build_array(o."name",d."consumer")::text AS "scope",
       d."available_at" FROM "_damat_event_deliveries" d
     JOIN "_damat_event_outbox" o ON o."id"=d."event_id"
     WHERE d."status" IN ('pending','retry_wait')`,
  );
  for (const row of routes.rows) {
    await redis.zadd("damat:ready:events:router", row.available_at.getTime(), row.id);
  }
  for (const row of deliveries.rows) {
    await redis.zadd(
      `damat:ready:events:delivery:${row.scope}`,
      row.available_at.getTime(),
      row.id,
    );
  }
}

async function clearReadyKeys(redis: Redis): Promise<void> {
  let cursor = "0";
  const readyKeys: string[] = [];
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "damat:ready:*", "COUNT", 100);
    cursor = next;
    readyKeys.push(...keys);
  } while (cursor !== "0");
  for (let index = 0; index < readyKeys.length; index += 100) {
    await redis.del(...readyKeys.slice(index, index + 100));
  }
}
