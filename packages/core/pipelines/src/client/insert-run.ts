import type { DurabilityExecutor } from "@damatjs/durability";
import { getPipelineDefaultRetention, type PipelineNode } from "../definitions";
import {
  appendPipelineActivity,
  createNodeExecution,
  findIdempotentPipelineRun,
  findPipelineRun,
  type ActiveVersionRow,
} from "../repositories";
import type { StartPipelineOptions } from "./start-types";

export async function insertPipelineRun(
  executor: DurabilityExecutor,
  version: ActiveVersionRow,
  input: unknown,
  options: StartPipelineOptions,
) {
  const id = crypto.randomUUID();
  const retention =
    version.manifest.retentionMs ?? getPipelineDefaultRetention();
  const result = await executor.query<{ id: string }>(
    `INSERT INTO "_damat_pipeline_runs"
      ("id","definition_id","version_id","status","input","metadata","trigger",
       "correlation_id","idempotency_key","parent_run_id","parent_node_execution_id","retention_ms")
     VALUES ($1,$2,$3,'running',$4::jsonb,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11)
     ON CONFLICT ("definition_id","idempotency_key")
       WHERE "idempotency_key" IS NOT NULL DO NOTHING RETURNING "id"`,
    [
      id,
      version.definition_id,
      version.id,
      JSON.stringify(input ?? null),
      JSON.stringify(options.metadata ?? {}),
      JSON.stringify(options.trigger ?? { kind: "api" }),
      options.correlationId ?? null,
      options.idempotencyKey ?? null,
      options.parentRunId ?? null,
      options.parentNodeExecutionId ?? null,
      retention === "forever" ? null : retention,
    ],
  );
  if (!result.rows[0] && options.idempotencyKey) {
    return findIdempotentPipelineRun(
      executor,
      version.definition_id,
      options.idempotencyKey,
    );
  }
  const start = version.manifest.nodes.find(
    (node) => node.id === version.manifest.start,
  ) as PipelineNode;
  await createNodeExecution(executor, {
    runId: id,
    nodeId: start.id,
    kind: start.kind,
    value: input,
  });
  await appendPipelineActivity(executor, {
    runId: id,
    type: "started",
    details: { versionId: version.id },
    ...(options.actor ? { actor: options.actor } : {}),
  });
  return findPipelineRun(id, executor);
}
