import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineManifest } from "../definitions";
import type { DefinitionRow } from "../repositories";
import type { DraftRow } from "./draft-rows";
import type { PipelineMutation } from "./types";

export async function saveDraft(
  executor: DurabilityExecutor,
  name: string,
  manifest: PipelineManifest,
  expected: number | undefined,
  mutation: PipelineMutation,
) {
  await executor.query(
    `INSERT INTO "_damat_pipeline_definitions" ("id","name","source")
     VALUES ($1,$2,'web') ON CONFLICT ("name") DO NOTHING`,
    [crypto.randomUUID(), name],
  );
  const owner = await executor.query<DefinitionRow>(
    `SELECT * FROM "_damat_pipeline_definitions" WHERE "name"=$1 FOR UPDATE`,
    [name],
  );
  if (owner.rows[0]!.source !== "web")
    throw new Error(`Pipeline "${name}" is code-owned`);
  const prior = await executor.query<{ revision: string }>(
    `SELECT "revision" FROM "_damat_pipeline_drafts"
     WHERE "definition_id"=$1 FOR UPDATE`,
    [owner.rows[0]!.id],
  );
  const priorRevision = prior.rows[0]
    ? Number(prior.rows[0].revision)
    : undefined;
  if (priorRevision !== expected)
    throw new Error("Pipeline draft revision conflict");
  const result = await writeDraft(
    executor,
    owner.rows[0]!.id,
    manifest,
    priorRevision,
    mutation,
  );
  if (!result.rows[0]) throw new Error("Pipeline draft revision conflict");
  const revision = Number(result.rows[0].revision);
  await executor.query(
    `INSERT INTO "_damat_pipeline_activity" ("type","details","actor")
     VALUES ('draft.saved',$1::jsonb,$2::jsonb)`,
    [
      JSON.stringify({
        name,
        priorRevision: priorRevision ?? null,
        revision,
        reason: mutation.reason,
      }),
      JSON.stringify(mutation.actor),
    ],
  );
  return { revision };
}

function writeDraft(
  executor: DurabilityExecutor,
  definitionId: string,
  manifest: PipelineManifest,
  revision: number | undefined,
  mutation: PipelineMutation,
) {
  const statement =
    revision === undefined
      ? `INSERT INTO "_damat_pipeline_drafts"
        ("definition_id","revision","manifest","actor","reason")
       VALUES ($1,1,$2::jsonb,$3::jsonb,$4) RETURNING "revision"`
      : `UPDATE "_damat_pipeline_drafts" SET "revision"="revision"+1,
        "manifest"=$2::jsonb,"actor"=$3::jsonb,"reason"=$4,"updated_at"=NOW()
       WHERE "definition_id"=$1 AND "revision"=$5 RETURNING "revision"`;
  const parameters: unknown[] = [
    definitionId,
    JSON.stringify(manifest),
    JSON.stringify(mutation.actor),
    mutation.reason,
  ];
  if (revision !== undefined) parameters.push(revision);
  return executor.query<DraftRow>(statement, parameters);
}
