import type { DurabilityExecutor } from "@damatjs/durability";
import { eventExecutor } from "./executor";
import {
  mapDurableEventActivity,
  type DurableEventActivityRow,
} from "./mappers";
import type { DurableEventActivity } from "./types";

export interface AppendEventActivityOptions {
  eventId: string;
  deliveryId?: string;
  consumer?: string;
  attemptNumber?: number;
  type: string;
  previousStatus?: string;
  nextStatus?: string;
  workerId?: string;
  leaseToken?: string;
  reason?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  actor?: Record<string, unknown>;
}

export async function appendDurableEventActivity(
  executor: DurabilityExecutor,
  eventId: string,
  type: string,
  metadata: Record<string, unknown> = {},
): Promise<DurableEventActivity> {
  const result = await executor.query<DurableEventActivityRow>(
    `INSERT INTO "_damat_event_activity" ("event_id","type","metadata")
     VALUES ($1,$2,$3::jsonb) RETURNING *`,
    [eventId, type, JSON.stringify(metadata)],
  );
  return mapDurableEventActivity(result.rows[0]!);
}

export async function appendEventActivity(
  executor: DurabilityExecutor,
  activity: AppendEventActivityOptions,
): Promise<void> {
  await executor.query(
    `INSERT INTO "_damat_event_activity"
     ("event_id","delivery_id","consumer","attempt_number","type",
      "previous_status","next_status","worker_id","lease_token","reason",
      "duration_ms","metadata","actor")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)`,
    [
      activity.eventId,
      activity.deliveryId ?? null,
      activity.consumer ?? null,
      activity.attemptNumber ?? null,
      activity.type,
      activity.previousStatus ?? null,
      activity.nextStatus ?? null,
      activity.workerId ?? null,
      activity.leaseToken ?? null,
      activity.reason ?? null,
      activity.durationMs ?? null,
      JSON.stringify(activity.metadata ?? {}),
      JSON.stringify(activity.actor ?? {}),
    ],
  );
}

export async function findDurableEventActivity(
  eventId: string,
  executor?: DurabilityExecutor,
): Promise<DurableEventActivity[]> {
  const result = await eventExecutor(executor).query<DurableEventActivityRow>(
    `SELECT * FROM "_damat_event_activity"
     WHERE "event_id" = $1 ORDER BY "id" ASC`,
    [eventId],
  );
  return result.rows.map(mapDurableEventActivity);
}
