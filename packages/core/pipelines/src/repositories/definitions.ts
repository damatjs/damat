import type { DurabilityExecutor, WorkActor } from "@damatjs/durability";
import type { PipelineDefinition } from "../definitions";
import type { DefinitionRow, VersionRow } from "./rows";
import { syncPipelineTriggers } from "../triggers/sync";

export async function syncCodeDefinition(
  executor: DurabilityExecutor,
  definition: PipelineDefinition,
  actor: WorkActor,
): Promise<string> {
  await executor.query(
    `INSERT INTO "_damat_pipeline_definitions" ("id","name","source")
     VALUES ($1,$2,'code') ON CONFLICT ("name") DO NOTHING`,
    [crypto.randomUUID(), definition.name],
  );
  const stored = await executor.query<DefinitionRow>(
    `SELECT * FROM "_damat_pipeline_definitions" WHERE "name"=$1 FOR UPDATE`,
    [definition.name],
  );
  const owner = stored.rows[0]!;
  if (owner.source !== "code")
    throw new Error(`Pipeline "${definition.name}" is web-owned`);
  const existing = await executor.query<VersionRow>(
    `SELECT * FROM "_damat_pipeline_versions"
     WHERE "definition_id"=$1 AND "source_version"=$2`,
    [owner.id, definition.version],
  );
  if (
    existing.rows[0]?.checksum !== undefined &&
    existing.rows[0].checksum !== definition.checksum
  ) {
    throw new Error(
      `Pipeline "${definition.name}" version "${definition.version}" changed checksum`,
    );
  }
  const versionId =
    existing.rows[0]?.id ??
    (await insertVersion(executor, owner.id, definition, actor));
  await executor.query(
    `UPDATE "_damat_pipeline_definitions" SET "active_version_id"=$2,"updated_at"=NOW()
     WHERE "id"=$1`,
    [owner.id, versionId],
  );
  await syncPipelineTriggers(executor, versionId, definition.manifest, actor);
  return versionId;
}

async function insertVersion(
  executor: DurabilityExecutor,
  definitionId: string,
  definition: PipelineDefinition,
  actor: WorkActor,
): Promise<string> {
  const id = crypto.randomUUID();
  await executor.query(
    `INSERT INTO "_damat_pipeline_versions"
      ("id","definition_id","source_version","checksum","manifest","actor","reason")
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
    [
      id,
      definitionId,
      definition.version,
      definition.checksum,
      JSON.stringify(definition.manifest),
      JSON.stringify(actor),
      "code definition synchronized",
    ],
  );
  return id;
}
