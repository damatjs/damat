import type { DurabilityExecutor } from "@damatjs/durability";
import { startPipeline } from "../client";
import type { PipelineTrigger } from "../definitions";
import { evaluatePipelineValue } from "../runtime";
import { nextCronOccurrence } from "./cron";
import { recordTriggerReceipt } from "./receipt";
import type { DueScheduleRow } from "./rows";

export async function processDuePipelineSchedules(
  executor: DurabilityExecutor,
  limit: number,
): Promise<number> {
  const due = await executor.query<DueScheduleRow>(
    `SELECT s."version_id",s."trigger_id",s."next_at",d."name",v."manifest"
     FROM "_damat_pipeline_schedules" s
     JOIN "_damat_pipeline_versions" v ON v."id"=s."version_id"
     JOIN "_damat_pipeline_definitions" d ON d."active_version_id"=v."id"
     JOIN "_damat_pipeline_trigger_controls" c ON c."version_id"=s."version_id"
       AND c."trigger_id"=s."trigger_id"
     WHERE s."enabled" AND c."enabled" AND s."next_at"<=NOW()
     ORDER BY s."next_at" FOR UPDATE OF s SKIP LOCKED LIMIT $1`,
    [limit],
  );
  for (const row of due.rows) await runOccurrence(executor, row);
  return due.rows.length;
}

async function runOccurrence(
  executor: DurabilityExecutor,
  row: DueScheduleRow,
): Promise<void> {
  const trigger = row.manifest.triggers?.find(
    (value) => value.id === row.trigger_id,
  );
  if (!trigger || trigger.kind === "event") return;
  const scheduledFor = row.next_at.toISOString();
  const context = {
    input: {},
    nodes: {},
    trigger: { kind: trigger.kind, scheduledFor },
  };
  const input = evaluatePipelineValue(trigger.input, context) ?? {
    scheduledFor,
  };
  const run = await startPipeline(row.name, input, {
    executor,
    versionId: row.version_id,
    idempotencyKey: `schedule:${row.version_id}:${row.trigger_id}:${scheduledFor}`,
    trigger: context.trigger,
    actor: { id: "pipeline-scheduler", type: "system" },
  });
  await recordTriggerReceipt(
    executor,
    row.version_id,
    row.trigger_id,
    scheduledFor,
    run.id,
  );
  await executor.query(
    `UPDATE "_damat_pipeline_schedules" SET "last_at"=$3,"next_at"=$4,"updated_at"=NOW()
     WHERE "version_id"=$1 AND "trigger_id"=$2`,
    [
      row.version_id,
      row.trigger_id,
      row.next_at,
      nextOccurrence(trigger, row.next_at),
    ],
  );
}

function nextOccurrence(
  trigger: Exclude<PipelineTrigger, { kind: "event" }>,
  after: Date,
): Date {
  return trigger.kind === "interval"
    ? new Date(after.getTime() + trigger.everyMs)
    : nextCronOccurrence(trigger.expression, after);
}
