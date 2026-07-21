import type { QueryResultRow } from "@damatjs/deps/pg";

export interface LayoutRow extends QueryResultRow {
  layout: Record<string, unknown>;
}

export interface TransitionRow extends QueryResultRow {
  id: string;
  from_execution_id: string | null;
  to_execution_id: string | null;
  edge: Record<string, unknown>;
  reason: string;
  created_at: Date;
}

export interface SignalRow extends QueryResultRow {
  id: string;
  name: string;
  payload: unknown;
  actor: Record<string, unknown>;
  reason: string;
  consumed_by: string | null;
  created_at: Date;
  consumed_at: Date | null;
}
