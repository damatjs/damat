import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import type { QueryResultRow } from "@damatjs/deps/pg";
import type { Redis } from "@damatjs/redis";
import { clearReadyProjection } from "./accelerationProjectionClear";

interface ReadyRow extends QueryResultRow {
  id: string;
  scope: string;
  available_at: Date;
}

export async function rebuildReadyProjection(
  redis: Redis,
  enabled: { jobs: boolean; events: boolean; pipelines?: boolean },
  executor: DurabilityExecutor = getDurabilityClient(),
): Promise<void> {
  await clearReadyProjection(redis);
  if (enabled.jobs) {
    const jobs = await executor.query<ReadyRow>(
      `SELECT "id","queue" AS "scope","available_at" FROM "_damat_job_runs"
       WHERE "status" IN ('queued','retry_wait')`,
    );
    for (const row of jobs.rows) {
      await redis.zadd(
        `damat:ready:jobs:${row.scope}`,
        row.available_at.getTime(),
        row.id,
      );
    }
  }
  if (enabled.events) await rebuildEventProjection(redis, executor);
  if (enabled.pipelines) await rebuildPipelineProjection(redis, executor);
}

async function rebuildPipelineProjection(
  redis: Redis,
  executor: DurabilityExecutor,
): Promise<void> {
  const runs = await executor.query<ReadyRow>(
    `SELECT DISTINCT ON (n."run_id") n."run_id" AS "id",d."name" AS "scope",
       n."available_at" FROM "_damat_pipeline_node_executions" n
     JOIN "_damat_pipeline_runs" r ON r."id"=n."run_id"
     JOIN "_damat_pipeline_definitions" d ON d."id"=r."definition_id"
     WHERE n."status" IN ('ready','waiting')
     ORDER BY n."run_id",n."available_at"`,
  );
  for (const row of runs.rows) {
    await redis.zadd(
      "damat:ready:pipelines:router",
      row.available_at.getTime(),
      row.id,
    );
  }
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
    await redis.zadd(
      "damat:ready:events:router",
      row.available_at.getTime(),
      row.id,
    );
  }
  for (const row of deliveries.rows) {
    await redis.zadd(
      `damat:ready:events:delivery:${row.scope}`,
      row.available_at.getTime(),
      row.id,
    );
  }
}
