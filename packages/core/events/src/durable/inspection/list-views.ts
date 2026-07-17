import type { DurableEventFilter } from "./types";
import type { EventOperationalView } from "./types";

export function eventViewExpressions(
  now: string,
): Record<EventOperationalView, string> {
  const delivery = (value: string) =>
    `EXISTS (SELECT 1 FROM "_damat_event_deliveries" v
      WHERE v."event_id"=o."id" AND ${value})`;
  return {
    upcoming: `(o."routed_at" IS NULL OR o."available_at">${now} OR ${delivery(
      `v."status" IN ('pending','retry_wait') AND v."available_at">${now}`,
    )})`,
    processing: delivery(
      `v."status"='running' OR (v."status"='pending' AND v."available_at"<=${now})`,
    ),
    retrying: delivery(`v."status"='retry_wait'`),
    failed: delivery(`v."status"='dead_lettered'`),
    completed: `(o."routed_at" IS NOT NULL AND NOT ${delivery(
      `v."status" IN ('pending','running','retry_wait','dead_lettered')`,
    )})`,
  };
}

export function addEventViewFilters(
  clauses: string[],
  params: unknown[],
  filter: DurableEventFilter,
): void {
  if (!filter.views?.length) return;
  const needsNow = filter.views.some(
    (view) => view === "upcoming" || view === "processing",
  );
  const now = needsNow ? `$${params.push(filter.now ?? new Date())}` : "NOW()";
  const map = eventViewExpressions(now);
  clauses.push(`(${filter.views.map((view) => map[view]).join(" OR ")})`);
}
