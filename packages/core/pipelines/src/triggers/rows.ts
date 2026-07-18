import type { QueryResultRow } from "@damatjs/deps/pg";
import type { PipelineManifest } from "../definitions";

export interface DueScheduleRow extends QueryResultRow {
  version_id: string;
  trigger_id: string;
  next_at: Date;
  name: string;
  manifest: PipelineManifest;
}

export interface TriggerVersionRow extends QueryResultRow {
  version_id: string;
  name: string;
  manifest: PipelineManifest;
  created_at: Date;
}

export interface TriggerEventRow extends QueryResultRow {
  id: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  correlation_id: string | null;
  created_at: Date;
}
