import { getDurableConsumerSnapshots } from "../definitions/snapshots";
import { appendEventActivity } from "../repositories/activity";
import type { RoutableEventRow, RoutingExecutor } from "./types";

export async function fanOutEvent(
  executor: RoutingExecutor,
  event: RoutableEventRow,
): Promise<string[]> {
  const consumers = getDurableConsumerSnapshots(event.name, {
    maxAttempts: event.max_attempts,
    backoffMs: Number(event.backoff_ms),
    backoffMultiplier: event.backoff_multiplier,
  });
  for (const consumer of consumers) {
    const inserted = await executor.query<{ id: string }>(
      `INSERT INTO "_damat_event_deliveries"
       ("id","event_id","consumer","max_attempts","backoff_ms",
        "backoff_multiplier","available_at","retention_at")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT ("event_id","consumer") DO NOTHING RETURNING "id"`,
      [
        crypto.randomUUID(),
        event.id,
        consumer.name,
        consumer.options.maxAttempts,
        consumer.options.backoffMs,
        consumer.options.backoffMultiplier,
        event.available_at,
        event.retention_at,
      ],
    );
    if (inserted.rows[0]) {
      await appendEventActivity(executor, {
        eventId: event.id,
        deliveryId: inserted.rows[0].id,
        consumer: consumer.name,
        type: "pending",
        nextStatus: "pending",
      });
    }
  }
  return consumers.map(({ name }) => name);
}
