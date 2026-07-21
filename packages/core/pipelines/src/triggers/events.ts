import type { DurabilityExecutor } from "@damatjs/durability";
import { startPipeline } from "../client";
import { evaluatePipelineValue } from "../runtime";
import { recordTriggerReceipt } from "./receipt";
import type { TriggerEventRow, TriggerVersionRow } from "./rows";

export async function processPipelineEventTriggers(
  executor: DurabilityExecutor,
  limit: number,
): Promise<number> {
  const versions = await executor.query<TriggerVersionRow>(
    `SELECT v."id" AS "version_id",d."name",v."manifest",v."created_at"
     FROM "_damat_pipeline_versions" v JOIN "_damat_pipeline_definitions" d
       ON d."active_version_id"=v."id"`,
  );
  let processed = 0;
  for (const version of versions.rows) {
    for (const trigger of version.manifest.triggers ?? []) {
      if (trigger.kind !== "event" || processed >= limit) continue;
      if (!(await triggerEnabled(executor, version.version_id, trigger.id)))
        continue;
      const events = await unmatchedEvents(
        executor,
        version,
        trigger.id,
        trigger.event,
        limit - processed,
      );
      for (const event of events) {
        const context = {
          input: {},
          nodes: {},
          event: event.payload,
          trigger: { kind: "event", eventId: event.id, event: trigger.event },
        };
        const input =
          evaluatePipelineValue(trigger.input, context) ?? event.payload;
        const run = await startPipeline(version.name, input, {
          executor,
          versionId: version.version_id,
          idempotencyKey: `event:${version.version_id}:${trigger.id}:${event.id}`,
          correlationId: event.correlation_id ?? event.id,
          trigger: context.trigger,
          actor: { id: "pipeline-event-trigger", type: "system" },
        });
        await recordTriggerReceipt(
          executor,
          version.version_id,
          trigger.id,
          event.id,
          run.id,
        );
        processed++;
      }
    }
  }
  return processed;
}

async function triggerEnabled(
  executor: DurabilityExecutor,
  versionId: string,
  triggerId: string,
) {
  const result = await executor.query<{ enabled: boolean }>(
    `SELECT "enabled" FROM "_damat_pipeline_trigger_controls"
     WHERE "version_id"=$1 AND "trigger_id"=$2`,
    [versionId, triggerId],
  );
  return result.rows[0]?.enabled === true;
}

async function unmatchedEvents(
  executor: DurabilityExecutor,
  version: TriggerVersionRow,
  triggerId: string,
  event: string,
  limit: number,
): Promise<TriggerEventRow[]> {
  const result = await executor.query<TriggerEventRow>(
    `SELECT e."id",e."payload",e."metadata",e."correlation_id",e."created_at"
     FROM "_damat_event_outbox" e WHERE e."name"=$1 AND e."created_at">=$2
       AND NOT EXISTS (SELECT 1 FROM "_damat_pipeline_trigger_receipts" r
         WHERE r."version_id"=$3 AND r."trigger_id"=$4 AND r."source_id"=e."id"::text)
     ORDER BY e."created_at",e."id" LIMIT $5`,
    [event, version.created_at, version.version_id, triggerId, limit],
  );
  return result.rows;
}
