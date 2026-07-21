import type { RoutableEventRow, RoutingExecutor } from "./types";

export async function claimUnroutedEvents(
  executor: RoutingExecutor,
  limit: number,
): Promise<RoutableEventRow[]> {
  const result = await executor.query<RoutableEventRow>(
    `SELECT * FROM "_damat_event_outbox"
     WHERE "routed_at" IS NULL AND "available_at" <= NOW()
     ORDER BY "available_at", "created_at", "id"
     FOR UPDATE SKIP LOCKED LIMIT $1`,
    [limit],
  );
  return result.rows;
}
