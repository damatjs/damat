import type { QueryResultRow } from "@damatjs/deps/pg";

export type PipelineNodeStatus =
  | "ready"
  | "queued"
  | "running"
  | "waiting"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled"
  | "compensated"
  | "compensation_failed";

export interface NodeExecutionRow extends QueryResultRow {
  id: string;
  run_id: string;
  node_id: string;
  activation_key: string;
  phase: "forward" | "compensation";
  kind: string;
  status: PipelineNodeStatus;
  input: unknown;
  output: unknown;
  error: Record<string, unknown> | null;
  job_run_id: string | null;
  child_run_id: string | null;
  available_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityRow extends QueryResultRow {
  id: string;
  run_id: string | null;
  node_execution_id: string | null;
  type: string;
  details: Record<string, unknown>;
  actor: Record<string, unknown>;
  created_at: Date;
}
