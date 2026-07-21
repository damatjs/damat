import { withIdempotency, type DurabilityClient } from "@damatjs/durability";
import type { StoredPipelineVersion } from "../repositories";
import type { DraftRow } from "./draft-rows";
import { validateMutation } from "./drafts";
import { insertPublishedVersion } from "./publish-version";
import type { PipelineMutation } from "./types";
import { mapAuthoringVersion, type AuthoringVersionRow } from "./version-map";
import { validateWebPipeline } from "./validate";

export async function publishPipelineDraft(
  client: DurabilityClient,
  name: string,
  expectedRevision: number,
  mutation: PipelineMutation,
): Promise<StoredPipelineVersion> {
  validateMutation(name, mutation);
  const versionId = await client.transaction(async (executor) => {
    const result = await withIdempotency(
      {
        scope: `pipeline-publish:${name}`,
        key: mutation.idempotencyKey,
        executor,
      },
      async (transaction) => {
        const current = await transaction.query<DraftRow>(
          `SELECT d.*,p."name" FROM "_damat_pipeline_drafts" d
           JOIN "_damat_pipeline_definitions" p ON p."id"=d."definition_id"
           WHERE p."name"=$1 AND d."revision"=$2 FOR UPDATE OF d`,
          [name, expectedRevision],
        );
        if (!current.rows[0])
          throw new Error("Pipeline draft revision conflict");
        const validation = await validateWebPipeline(
          current.rows[0].manifest,
          transaction,
        );
        if (!validation.valid) throw new Error(validation.errors.join("; "));
        return insertPublishedVersion(transaction, current.rows[0], mutation);
      },
    );
    return String(result.value);
  });
  const stored = await readVersion(client, versionId);
  if (!stored) throw new Error("Published pipeline version was not found");
  return mapAuthoringVersion(stored);
}

function readVersion(client: DurabilityClient, id: string) {
  return client
    .query<AuthoringVersionRow>(
      `SELECT v.*,d."name",d."source",d."active_version_id"=v."id" AS "active"
     FROM "_damat_pipeline_versions" v JOIN "_damat_pipeline_definitions" d
       ON d."id"=v."definition_id" WHERE v."id"=$1`,
      [id],
    )
    .then((result) => result.rows[0]);
}
