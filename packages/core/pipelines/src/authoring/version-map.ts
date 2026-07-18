import type { QueryResultRow } from "@damatjs/deps/pg";
import type { PipelineManifest } from "../definitions";
import type { StoredPipelineVersion } from "../repositories";

export interface AuthoringVersionRow extends QueryResultRow {
  id: string;
  definition_id: string;
  name: string;
  source: "code" | "web";
  source_version: string;
  checksum: string;
  manifest: PipelineManifest;
  active: boolean;
  created_at: Date;
}

export const mapAuthoringVersion = (
  row: AuthoringVersionRow,
): StoredPipelineVersion => ({
  id: row.id,
  definitionId: row.definition_id,
  name: row.name,
  source: row.source,
  sourceVersion: row.source_version,
  checksum: row.checksum,
  manifest: row.manifest,
  active: row.active,
  createdAt: row.created_at,
});
