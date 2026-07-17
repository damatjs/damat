import type { DurabilityExecutor } from "@damatjs/durability";
import { eventExecutor } from "./executor";
import {
  mapDurableEventActivity,
  type DurableEventActivityRow,
} from "./mappers";
import type { DurableEventActivity } from "./types";

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
