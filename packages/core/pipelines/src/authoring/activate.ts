import { withIdempotency, type DurabilityClient } from "@damatjs/durability";
import { validateMutation } from "./drafts";
import type { PipelineMutation } from "./types";
import { validatePipelineComposition } from "../client/composition";

export async function activatePipelineVersion(
  client: DurabilityClient,
  name: string,
  versionId: string,
  mutation: PipelineMutation,
): Promise<void> {
  validateMutation(name, mutation);
  await client.transaction(async (executor) => {
    await withIdempotency(
      {
        scope: `pipeline-activate:${name}`,
        key: mutation.idempotencyKey,
        executor,
      },
      async (transaction) => {
        const owner = await transaction.query<{
          id: string;
          active_version_id: string | null;
        }>(
          `SELECT "id","active_version_id" FROM "_damat_pipeline_definitions"
           WHERE "name"=$1 FOR UPDATE`,
          [name],
        );
        const definition = owner.rows[0];
        if (!definition) throw new Error(`Pipeline "${name}" was not found`);
        const version = await transaction.query(
          `SELECT 1 FROM "_damat_pipeline_versions" WHERE "id"=$1 AND "definition_id"=$2`,
          [versionId, definition.id],
        );
        if (!version.rowCount)
          throw new Error("Pipeline version does not belong to the definition");
        await transaction.query(
          `UPDATE "_damat_pipeline_definitions" SET "active_version_id"=$2,"updated_at"=NOW()
           WHERE "id"=$1`,
          [definition.id, versionId],
        );
        await validatePipelineComposition(transaction);
        await transaction.query(
          `INSERT INTO "_damat_pipeline_activity" ("type","details","actor")
           VALUES ('version.activated',$1::jsonb,$2::jsonb)`,
          [
            JSON.stringify({
              name,
              priorVersionId: definition.active_version_id,
              versionId,
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
