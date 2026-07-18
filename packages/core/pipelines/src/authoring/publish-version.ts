import type { DurabilityExecutor } from "@damatjs/durability";
import { validatePipelineComposition } from "../client/composition";
import { pipelineChecksum } from "../definitions/stable";
import { syncPipelineTriggers } from "../triggers/sync";
import type { DraftRow } from "./draft-rows";
import type { PipelineMutation } from "./types";

export async function insertPublishedVersion(
  executor: DurabilityExecutor,
  draft: DraftRow,
  mutation: PipelineMutation,
): Promise<string> {
  const id = crypto.randomUUID();
  const sourceVersion = `web:${id}`;
  await executor.query(
    `INSERT INTO "_damat_pipeline_versions"
      ("id","definition_id","source_version","checksum","manifest","actor","reason")
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
    [
      id,
      draft.definition_id,
      sourceVersion,
      pipelineChecksum(draft.manifest),
      JSON.stringify(draft.manifest),
      JSON.stringify(mutation.actor),
      mutation.reason,
    ],
  );
  await executor.query(
    `UPDATE "_damat_pipeline_definitions" SET "active_version_id"=$2,"updated_at"=NOW()
     WHERE "id"=$1`,
    [draft.definition_id, id],
  );
  await syncPipelineTriggers(executor, id, draft.manifest, mutation.actor);
  await validatePipelineComposition(executor);
  await executor.query(
    `INSERT INTO "_damat_pipeline_activity" ("type","details","actor")
     VALUES ('version.published',$1::jsonb,$2::jsonb)`,
    [
      JSON.stringify({
        name: draft.name,
        versionId: id,
        sourceVersion,
        priorDraftRevision: Number(draft.revision),
        reason: mutation.reason,
      }),
      JSON.stringify(mutation.actor),
    ],
  );
  await executor.query(
    `DELETE FROM "_damat_pipeline_drafts" WHERE "definition_id"=$1`,
    [draft.definition_id],
  );
  return id;
}
