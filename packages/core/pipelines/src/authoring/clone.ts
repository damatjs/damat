import type { DurabilityClient } from "@damatjs/durability";
import { savePipelineDraft } from "./drafts";
import type { PipelineMutation } from "./types";
import type { AuthoringVersionRow } from "./version-map";

export async function clonePipelineVersionToDraft(
  client: DurabilityClient,
  versionId: string,
  targetName: string,
  expectedRevision: number | undefined,
  mutation: PipelineMutation,
) {
  const result = await client.query<AuthoringVersionRow>(
    `SELECT v.*,d."name",d."source",false AS "active"
     FROM "_damat_pipeline_versions" v JOIN "_damat_pipeline_definitions" d
       ON d."id"=v."definition_id" WHERE v."id"=$1`,
    [versionId],
  );
  const version = result.rows[0];
  if (!version)
    throw new Error(`Pipeline version "${versionId}" was not found`);
  return savePipelineDraft(
    client,
    targetName,
    version.manifest,
    expectedRevision,
    mutation,
  );
}
