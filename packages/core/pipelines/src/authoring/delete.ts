import { withIdempotency, type DurabilityClient } from "@damatjs/durability";
import { validateMutation } from "./drafts";
import type { PipelineMutation } from "./types";

export async function deletePipelineDraft(
  client: DurabilityClient,
  name: string,
  expectedRevision: number,
  mutation: PipelineMutation,
): Promise<void> {
  validateMutation(name, mutation);
  await client.transaction(async (executor) => {
    await withIdempotency(
      {
        scope: `pipeline-draft-delete:${name}`,
        key: mutation.idempotencyKey,
        executor,
      },
      async (transaction) => {
        const result = await transaction.query<{ definition_id: string }>(
          `DELETE FROM "_damat_pipeline_drafts" d USING "_damat_pipeline_definitions" p
           WHERE d."definition_id"=p."id" AND p."name"=$1 AND p."source"='web'
             AND d."revision"=$2 RETURNING d."definition_id"`,
          [name, expectedRevision],
        );
        if (!result.rows[0])
          throw new Error("Pipeline draft revision conflict");
        await transaction.query(
          `INSERT INTO "_damat_pipeline_activity" ("type","details","actor")
           VALUES ('draft.deleted',$1::jsonb,$2::jsonb)`,
          [
            JSON.stringify({ name, expectedRevision, reason: mutation.reason }),
            JSON.stringify(mutation.actor),
          ],
        );
        return null;
      },
    );
  });
}
