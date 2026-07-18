import type { QueryResultRow } from "@damatjs/deps/pg";
import type { PipelineManifest } from "../definitions";

export interface DraftRow extends QueryResultRow {
  definition_id: string;
  name: string;
  revision: string;
  manifest: PipelineManifest;
  updated_at: Date;
}
