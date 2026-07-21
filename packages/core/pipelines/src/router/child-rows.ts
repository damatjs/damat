import type { QueryResultRow } from "@damatjs/deps/pg";

export interface ChildRunRow extends QueryResultRow {
  id: string;
  status: string;
  input: unknown;
  output: unknown;
  error: Record<string, unknown> | null;
  completed_at: Date | null;
  created_at: Date;
}
