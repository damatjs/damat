import type { DurabilityExecutor } from "@damatjs/durability";

export async function recordTriggerReceipt(
  executor: DurabilityExecutor,
  versionId: string,
  triggerId: string,
  sourceId: string,
  runId: string,
): Promise<boolean> {
  const result = await executor.query(
    `INSERT INTO "_damat_pipeline_trigger_receipts"
      ("id","version_id","trigger_id","source_id","run_id")
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT ("version_id","trigger_id","source_id") DO NOTHING`,
    [crypto.randomUUID(), versionId, triggerId, sourceId, runId],
  );
  return result.rowCount === 1;
}
