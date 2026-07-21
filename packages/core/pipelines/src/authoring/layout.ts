import { withIdempotency, type DurabilityClient } from "@damatjs/durability";
import { validateMutation } from "./drafts";
import type { PipelineMutation } from "./types";

export async function savePipelineLayout(
  client: DurabilityClient,
  versionId: string,
  layout: Record<string, unknown>,
  mutation: PipelineMutation,
): Promise<number> {
  validateMutation(versionId, mutation);
  return client.transaction(async (executor) => {
    const result = await withIdempotency(
      {
        scope: `pipeline-layout:${versionId}`,
        key: mutation.idempotencyKey,
        executor,
      },
      async (transaction) => {
        const version = await transaction.query(
          `SELECT 1 FROM "_damat_pipeline_versions" WHERE "id"=$1 FOR UPDATE`,
          [versionId],
        );
        if (!version.rowCount)
          throw new Error(`Pipeline version "${versionId}" was not found`);
        const revision = await transaction.query<{ value: string }>(
          `SELECT COALESCE(MAX("revision"),0)+1 AS "value"
           FROM "_damat_pipeline_layouts" WHERE "version_id"=$1`,
          [versionId],
        );
        const value = Number(revision.rows[0]!.value);
        await transaction.query(
          `INSERT INTO "_damat_pipeline_layouts"
            ("id","version_id","revision","layout","actor","reason")
           VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)`,
          [
            crypto.randomUUID(),
            versionId,
            value,
            JSON.stringify(layout),
            JSON.stringify(mutation.actor),
            mutation.reason,
          ],
        );
        await transaction.query(
          `INSERT INTO "_damat_pipeline_activity" ("type","details","actor")
           VALUES ('layout.saved',$1::jsonb,$2::jsonb)`,
          [
            JSON.stringify({
              versionId,
              revision: value,
              reason: mutation.reason,
            }),
            JSON.stringify(mutation.actor),
          ],
        );
        return value;
      },
    );
    return Number(result.value);
  });
}
