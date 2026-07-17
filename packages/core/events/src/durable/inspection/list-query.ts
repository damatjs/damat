import type { QueryResultRow } from "@damatjs/deps/pg";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { DurableEventRow } from "../repositories/mappers";
import { eventListPredicates } from "./list-predicates";
import { eventViewExpressions } from "./list-views";
import type { ResolvedEventInspectionOptions } from "./options";
import type { DurableEventFilter } from "./types";
import type { EventOperationalView } from "./types";

export interface EventSummaryRow extends DurableEventRow, QueryResultRow {
  sort_timestamp: string;
  delivery_counts: Record<string, number>;
  recovered: boolean;
  view_flags: EventOperationalView[];
}

export async function queryEventSummaryRows(
  executor: DurabilityExecutor,
  filter: DurableEventFilter,
  options: ResolvedEventInspectionOptions,
  limit: number,
): Promise<EventSummaryRow[]> {
  const predicate = eventListPredicates(filter, options);
  const now = `$${predicate.params.push(filter.now ?? new Date())}`;
  const views = eventViewExpressions(now);
  const viewFlags = Object.entries(views)
    .map(([view, expression]) => `CASE WHEN ${expression} THEN '${view}' END`)
    .join(",");
  const limitParameter = `$${predicate.params.push(limit + 1)}`;
  const result = await executor.query<EventSummaryRow>(
    `SELECT o.*,
       to_char(date_trunc('milliseconds',o."created_at" AT TIME ZONE 'UTC'),
         'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "sort_timestamp",
       COALESCE(c."delivery_counts",'{}'::jsonb) AS "delivery_counts",
       ARRAY_REMOVE(ARRAY[${viewFlags}],NULL) AS "view_flags",
       EXISTS (SELECT 1 FROM "_damat_event_activity" r
         WHERE r."event_id"=o."id" AND r."type"='lease_recovered') AS "recovered"
     FROM "_damat_event_outbox" o
     LEFT JOIN LATERAL (
       SELECT jsonb_object_agg(s."status",s."total") AS "delivery_counts"
       FROM (SELECT d."status",COUNT(*)::int AS "total"
         FROM "_damat_event_deliveries" d WHERE d."event_id"=o."id"
         GROUP BY d."status") s
     ) c ON TRUE ${predicate.sql}
     ORDER BY date_trunc('milliseconds',o."created_at" AT TIME ZONE 'UTC') DESC,
       o."id" DESC LIMIT ${limitParameter}`,
    predicate.params,
  );
  return result.rows;
}
