import type { DurabilityExecutor } from "@damatjs/durability";
import { eventExecutor } from "./executor";
import { mapDurableEvent, type DurableEventRow } from "./mappers";
import type {
  DurableEventRecord,
  ListDurableEventsOptions,
  NewDurableEvent,
} from "./types";

export async function insertDurableEvent(
  executor: DurabilityExecutor,
  event: NewDurableEvent,
): Promise<DurableEventRecord | undefined> {
  const result = await executor.query<DurableEventRow>(
    `INSERT INTO "_damat_event_outbox" (
       "id","name","payload","metadata","policy_version","max_attempts",
       "backoff_ms","backoff_multiplier","retention_ms","idempotency_key",
       "correlation_id","causation_id","occurred_at","available_at","retention_at"
     ) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT ON CONSTRAINT "_damat_event_outbox_idempotency_uidx" DO NOTHING
     RETURNING *`,
    [
      event.id,
      event.name,
      JSON.stringify(event.payload ?? null),
      JSON.stringify(event.metadata),
      event.policyVersion,
      event.maxAttempts,
      event.backoffMs,
      event.backoffMultiplier,
      event.retentionMs,
      event.idempotencyKey ?? null,
      event.correlationId ?? null,
      event.causationId ?? null,
      event.occurredAt,
      event.availableAt,
      event.retentionAt,
    ],
  );
  return result.rows[0] ? mapDurableEvent(result.rows[0]) : undefined;
}

export async function findDurableEvent(
  id: string,
  executor?: DurabilityExecutor,
): Promise<DurableEventRecord | undefined> {
  const result = await eventExecutor(executor).query<DurableEventRow>(
    `SELECT * FROM "_damat_event_outbox" WHERE "id" = $1`,
    [id],
  );
  return result.rows[0] ? mapDurableEvent(result.rows[0]) : undefined;
}

export async function findIdempotentEvent(
  executor: DurabilityExecutor,
  name: string,
  key: string,
): Promise<DurableEventRecord | undefined> {
  const result = await executor.query<DurableEventRow>(
    `SELECT * FROM "_damat_event_outbox"
     WHERE "name" = $1 AND "idempotency_key" = $2`,
    [name, key],
  );
  return result.rows[0] ? mapDurableEvent(result.rows[0]) : undefined;
}

export async function listDurableEvents(
  options: ListDurableEventsOptions = {},
): Promise<DurableEventRecord[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const params: unknown[] = [];
  const where = options.name
    ? `WHERE "name" = $${params.push(options.name)}`
    : "";
  params.push(limit);
  const result = await eventExecutor(options.executor).query<DurableEventRow>(
    `SELECT * FROM "_damat_event_outbox" ${where}
     ORDER BY "created_at" DESC, "id" DESC LIMIT $${params.length}`,
    params,
  );
  return result.rows.map(mapDurableEvent);
}
