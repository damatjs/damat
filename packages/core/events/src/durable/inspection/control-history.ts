import {
  type DurabilityExecutor,
  type WorkActor,
  type WorkControlActivity,
} from "@damatjs/durability";
import type { QueryResultRow } from "@damatjs/deps/pg";
import { encodeEventConsumerScope } from "../worker";

const CONTROL_HISTORY_LIMIT = 500;

interface ControlActivityRow extends QueryResultRow {
  id: string;
  scope: string;
  action: "paused" | "resumed";
  reason: string | null;
  actor: WorkActor;
  created_at: Date;
}

export async function queryEventControlHistory(
  executor: DurabilityExecutor,
  event: string,
  consumers: string[],
): Promise<{ controls: WorkControlActivity[]; truncated: boolean }> {
  const scopes = [...new Set(consumers)].map((consumer) =>
    encodeEventConsumerScope(event, consumer),
  );
  const result = await executor.query<ControlActivityRow>(
    `SELECT "id","scope","action","reason","actor","created_at"
     FROM "_damat_work_control_activity"
     WHERE "work_kind"='event' AND "scope"=ANY($1::text[])
     ORDER BY "id" ASC LIMIT $2`,
    [scopes, CONTROL_HISTORY_LIMIT + 1],
  );
  const controls = result.rows.map(mapControlActivity);
  return {
    controls: controls.slice(0, CONTROL_HISTORY_LIMIT),
    truncated: controls.length > CONTROL_HISTORY_LIMIT,
  };
}

function mapControlActivity(row: ControlActivityRow): WorkControlActivity {
  return {
    id: String(row.id),
    kind: "event",
    scope: row.scope,
    action: row.action,
    ...(row.reason !== null ? { reason: row.reason } : {}),
    actor: row.actor,
    createdAt: row.created_at,
  };
}
