import type { DurabilityExecutor } from "@damatjs/durability";
import { mapPipelineRun } from "./mappers";
import { pipelineExecutor, RUN_SELECT } from "./query";
import type { RunRow } from "./rows";

export async function findPipelineRun(
  id: string,
  executor?: DurabilityExecutor,
) {
  const result = await pipelineExecutor(executor).query<RunRow>(
    `${RUN_SELECT} WHERE r."id"=$1`,
    [id],
  );
  return result.rows[0] ? mapPipelineRun(result.rows[0]) : undefined;
}

export async function findIdempotentPipelineRun(
  executor: DurabilityExecutor,
  definitionId: string,
  key: string,
) {
  const result = await executor.query<RunRow>(
    `${RUN_SELECT} WHERE r."definition_id"=$1 AND r."idempotency_key"=$2`,
    [definitionId, key],
  );
  return result.rows[0] ? mapPipelineRun(result.rows[0]) : undefined;
}

export async function listPipelineRuns(
  options: {
    status?: string;
    name?: string;
    limit?: number;
    executor?: DurabilityExecutor;
  } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const result = await pipelineExecutor(options.executor).query<RunRow>(
    `${RUN_SELECT} WHERE ($1::text IS NULL OR r."status"=$1)
       AND ($2::text IS NULL OR d."name"=$2)
     ORDER BY r."created_at" DESC,r."id" DESC LIMIT $3`,
    [options.status ?? null, options.name ?? null, limit],
  );
  return result.rows.map(mapPipelineRun);
}
