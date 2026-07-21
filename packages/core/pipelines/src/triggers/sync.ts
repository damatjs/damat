import type { DurabilityExecutor, WorkActor } from "@damatjs/durability";
import type { PipelineManifest } from "../definitions";
import { nextCronOccurrence } from "./cron";

export async function syncPipelineTriggers(
  executor: DurabilityExecutor,
  versionId: string,
  manifest: PipelineManifest,
  actor: WorkActor,
): Promise<void> {
  for (const trigger of manifest.triggers ?? []) {
    await executor.query(
      `INSERT INTO "_damat_pipeline_trigger_controls"
        ("version_id","trigger_id","enabled","actor","reason")
       VALUES ($1,$2,$3,$4::jsonb,'definition synchronized')
       ON CONFLICT ("version_id","trigger_id") DO NOTHING`,
      [versionId, trigger.id, trigger.enabled !== false, JSON.stringify(actor)],
    );
    if (trigger.kind === "event") continue;
    const next =
      trigger.kind === "interval"
        ? new Date(Date.now() + trigger.everyMs)
        : nextCronOccurrence(trigger.expression, new Date());
    await executor.query(
      `INSERT INTO "_damat_pipeline_schedules"
        ("version_id","trigger_id","enabled","next_at") VALUES ($1,$2,$3,$4)
       ON CONFLICT ("version_id","trigger_id") DO NOTHING`,
      [versionId, trigger.id, trigger.enabled !== false, next],
    );
  }
}
