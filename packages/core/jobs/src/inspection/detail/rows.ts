import type { QueryResultRow } from "@damatjs/deps/pg";
import type { JsonValue } from "@damatjs/durability";
import type { InspectionRunRow } from "../list/rows";

export interface DetailRunRow extends InspectionRunRow {
  progress: JsonValue | null;
  result: JsonValue | null;
  last_error: Record<string, unknown> | null;
}

export interface ScheduleActivityRow extends QueryResultRow {
  id: string;
  type: string;
  occurred_at: Date;
  metadata: Record<string, unknown>;
  actor: Record<string, unknown>;
}
