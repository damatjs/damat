import { withIdempotency, type DurabilityClient } from "@damatjs/durability";
import { validateMutation } from "./drafts";
import type { PipelineMutation } from "./types";

export async function setPipelineTriggerEnabled(
  client: DurabilityClient,
  versionId: string,
  triggerId: string,
  enabled: boolean,
  mutation: PipelineMutation,
): Promise<void> {
  validateMutation(versionId, mutation);
  await client.transaction(async (executor) => {
    await withIdempotency(
      {
        scope: `pipeline-trigger:${versionId}:${triggerId}`,
        key: mutation.idempotencyKey,
        executor,
      },
      async (transaction) => {
        const prior = await transaction.query<{ enabled: boolean }>(
          `SELECT "enabled" FROM "_damat_pipeline_trigger_controls"
           WHERE "version_id"=$1 AND "trigger_id"=$2 FOR UPDATE`,
          [versionId, triggerId],
        );
        if (!prior.rows[0]) throw new Error("Pipeline trigger was not found");
        const result = await transaction.query(
          `UPDATE "_damat_pipeline_trigger_controls" SET "enabled"=$3,
           "actor"=$4::jsonb,"reason"=$5,"updated_at"=NOW()
           WHERE "version_id"=$1 AND "trigger_id"=$2`,
          [
            versionId,
            triggerId,
            enabled,
            JSON.stringify(mutation.actor),
            mutation.reason,
          ],
        );
        if (result.rowCount !== 1)
          throw new Error("Pipeline trigger was not found");
        await transaction.query(
          `UPDATE "_damat_pipeline_schedules" SET "enabled"=$3,"updated_at"=NOW()
           WHERE "version_id"=$1 AND "trigger_id"=$2`,
          [versionId, triggerId, enabled],
        );
        await transaction.query(
          `INSERT INTO "_damat_pipeline_activity" ("type","details","actor")
           VALUES ('trigger.controlled',$1::jsonb,$2::jsonb)`,
          [
            JSON.stringify({
              versionId,
              triggerId,
              priorEnabled: prior.rows[0].enabled,
              enabled,
              reason: mutation.reason,
            }),
            JSON.stringify(mutation.actor),
          ],
        );
        return null;
      },
    );
  });
}
