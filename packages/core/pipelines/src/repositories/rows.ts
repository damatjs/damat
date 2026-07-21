import type { QueryResultRow } from "@damatjs/deps/pg";
import type { PipelineManifest } from "../definitions";

export interface DefinitionRow extends QueryResultRow {
  id: string;
  name: string;
  source: "code" | "web";
  active_version_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VersionRow extends QueryResultRow {
  id: string;
  definition_id: string;
  source_version: string;
  checksum: string;
  manifest: PipelineManifest;
  status: "published" | "deprecated";
  actor: Record<string, unknown>;
  reason: string | null;
  created_at: Date;
}

export interface RunRow extends QueryResultRow {
  id: string;
  definition_id: string;
  version_id: string;
  name: string;
  source_version: string;
  manifest: PipelineManifest;
  status: PipelineRunStatus;
  input: unknown;
  output: unknown;
  error: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  trigger: Record<string, unknown>;
  correlation_id: string | null;
  idempotency_key: string | null;
  parent_run_id: string | null;
  parent_node_execution_id: string | null;
  retention_ms: string | null;
  retention_at: Date | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date;
  completed_at: Date | null;
}

export type PipelineRunStatus =
  | "running"
  | "waiting"
  | "paused"
  | "compensating"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "compensated"
  | "compensation_failed";
