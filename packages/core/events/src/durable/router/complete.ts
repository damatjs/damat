import type { RoutableEventRow, RoutingExecutor } from "./types";
import { appendEventActivity } from "../repositories/activity";

export async function completeEventRouting(
  executor: RoutingExecutor,
  event: RoutableEventRow,
  consumers: string[],
): Promise<void> {
  await executor.query(
    `UPDATE "_damat_event_outbox" SET "routed_at"=NOW()
     WHERE "id"=$1 AND "routed_at" IS NULL`,
    [event.id],
  );
  await appendEventActivity(executor, {
    eventId: event.id,
    type: "routed",
    metadata: { consumerCount: consumers.length, consumers },
  });
}
