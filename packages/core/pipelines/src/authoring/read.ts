import type { DurabilityClient, WorkActor } from "@damatjs/durability";
import type { QueryResultRow } from "@damatjs/deps/pg";
import type { StoredPipelineVersion } from "../repositories";
import type { DraftRow } from "./draft-rows";
import type {
  PipelineDefinitionSummary,
  PipelineDraft,
  PipelineLayout,
} from "./types";
import { mapAuthoringVersion, type AuthoringVersionRow } from "./version-map";

interface DefinitionSummaryRow extends QueryResultRow {
  id: string;
  name: string;
  source: "code" | "web";
  active_version_id: string | null;
  has_draft: boolean;
  updated_at: Date;
}
interface LayoutRow extends QueryResultRow {
  revision: string;
  layout: Record<string, unknown>;
  actor: WorkActor;
  reason: string;
  created_at: Date;
}

export const mapDraft = (row: DraftRow): PipelineDraft => ({
  definitionId: row.definition_id,
  name: row.name,
  revision: Number(row.revision),
  manifest: row.manifest,
  updatedAt: row.updated_at,
});

export async function getPipelineDraft(client: DurabilityClient, name: string) {
  const result = await client.query<DraftRow>(
    `SELECT d.*,p."name" FROM "_damat_pipeline_drafts" d
     JOIN "_damat_pipeline_definitions" p ON p."id"=d."definition_id"
     WHERE p."name"=$1`,
    [name],
  );
  return result.rows[0] ? mapDraft(result.rows[0]) : undefined;
}

export async function listPipelineDefinitions(
  client: DurabilityClient,
): Promise<PipelineDefinitionSummary[]> {
  const result = await client.query<DefinitionSummaryRow>(
    `SELECT d.*,EXISTS(SELECT 1 FROM "_damat_pipeline_drafts" x
       WHERE x."definition_id"=d."id") AS "has_draft"
     FROM "_damat_pipeline_definitions" d ORDER BY d."name"`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    source: row.source,
    ...(row.active_version_id
      ? { activeVersionId: row.active_version_id }
      : {}),
    hasDraft: row.has_draft,
    updatedAt: row.updated_at,
  }));
}

export async function listPipelineVersions(
  client: DurabilityClient,
  name: string,
): Promise<StoredPipelineVersion[]> {
  const result = await client.query<AuthoringVersionRow>(
    `SELECT v.*,d."name",d."source",d."active_version_id"=v."id" AS "active"
     FROM "_damat_pipeline_versions" v JOIN "_damat_pipeline_definitions" d
       ON d."id"=v."definition_id" WHERE d."name"=$1 ORDER BY v."created_at" DESC`,
    [name],
  );
  return result.rows.map(mapAuthoringVersion);
}

export async function getPipelineLayout(
  client: DurabilityClient,
  versionId: string,
): Promise<PipelineLayout | undefined> {
  const result = await client.query<LayoutRow>(
    `SELECT "revision","layout","actor","reason","created_at"
     FROM "_damat_pipeline_layouts" WHERE "version_id"=$1
     ORDER BY "revision" DESC LIMIT 1`,
    [versionId],
  );
  const row = result.rows[0];
  return row
    ? {
        revision: Number(row.revision),
        layout: row.layout,
        actor: row.actor,
        reason: row.reason,
        createdAt: row.created_at,
      }
    : undefined;
}
