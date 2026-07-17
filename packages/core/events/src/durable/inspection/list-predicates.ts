import { decodeCursor } from "@damatjs/durability";
import type { DurableEventFilter } from "./types";
import type { ResolvedEventInspectionOptions } from "./options";
import { addEventViewFilters } from "./list-views";

export interface EventListPredicates {
  sql: string;
  params: unknown[];
}

export function eventListPredicates(
  filter: DurableEventFilter,
  options: ResolvedEventInspectionOptions,
): EventListPredicates {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const add = (value: unknown) => `$${params.push(value)}`;
  if (filter.names?.length)
    clauses.push(`o."name"=ANY(${add(filter.names)}::text[])`);
  if (filter.correlationId)
    clauses.push(`o."correlation_id"=${add(filter.correlationId)}`);
  if (filter.causationId)
    clauses.push(`o."causation_id"=${add(filter.causationId)}`);
  if (filter.idempotencyKey)
    clauses.push(`o."idempotency_key"=${add(filter.idempotencyKey)}`);
  addRange(clauses, params, 'o."created_at"', filter.created);
  addRange(clauses, params, 'o."available_at"', filter.available);
  addDeliveryFilters(clauses, params, filter);
  addEventViewFilters(clauses, params, filter);
  if (filter.recovered !== undefined) {
    const exists = `EXISTS (SELECT 1 FROM "_damat_event_activity" r
      WHERE r."event_id"=o."id" AND r."type"='lease_recovered')`;
    clauses.push(filter.recovered ? exists : `NOT ${exists}`);
  }
  if (filter.cursor) {
    const cursor = decodeCursor(filter.cursor, options.cursorSigningKey);
    clauses.push(`(date_trunc('milliseconds',o."created_at" AT TIME ZONE 'UTC'),
      o."id")<(${add(cursor.sortTimestamp)}::timestamp,${add(cursor.id)}::uuid)`);
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function addRange(
  clauses: string[],
  params: unknown[],
  field: string,
  range?: { from?: Date; to?: Date },
) {
  if (range?.from) clauses.push(`${field}>=$${params.push(range.from)}`);
  if (range?.to) clauses.push(`${field}<$${params.push(range.to)}`);
}

function addDeliveryFilters(
  clauses: string[],
  params: unknown[],
  filter: DurableEventFilter,
) {
  const parts: string[] = [];
  const add = (value: unknown) => `$${params.push(value)}`;
  if (filter.consumers?.length)
    parts.push(`d."consumer"=ANY(${add(filter.consumers)}::text[])`);
  if (filter.statuses?.length)
    parts.push(`d."status"=ANY(${add(filter.statuses)}::text[])`);
  if (filter.workerId) parts.push(`d."lease_owner"=${add(filter.workerId)}`);
  addRange(parts, params, 'd."started_at"', filter.started);
  addRange(parts, params, 'd."completed_at"', filter.finished);
  if (filter.leaseState) {
    const now = add(filter.now ?? new Date());
    parts.push(
      `d."status"='running' AND d."lease_expires_at"${
        filter.leaseState === "active" ? ">" : "<="
      }${now}`,
    );
  }
  if (filter.failed?.from || filter.failed?.to) {
    const activity = [`a."delivery_id"=d."id"`, `a."type"='dead_lettered'`];
    addRange(activity, params, 'a."occurred_at"', filter.failed);
    parts.push(`EXISTS (SELECT 1 FROM "_damat_event_activity" a
      WHERE ${activity.join(" AND ")})`);
  }
  if (parts.length)
    clauses.push(`EXISTS (SELECT 1 FROM "_damat_event_deliveries" d
      WHERE d."event_id"=o."id" AND ${parts.join(" AND ")})`);
}
