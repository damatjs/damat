import {
  getDurabilityClient,
  shouldRecordProgressActivity,
  type JsonValue,
} from "@damatjs/durability";
import { appendEventActivity } from "../../repositories/activity";
import { assertCurrentEventDeliveryLease } from "../fence";
import type { ClaimedEventDelivery } from "../types";

export async function recordEventDeliveryProgress(
  claim: ClaimedEventDelivery,
  value: JsonValue,
  metadata: Record<string, unknown> = {},
  minimumIntervalMs = 1_000,
): Promise<void> {
  await getDurabilityClient().transaction(async (executor) => {
    await assertCurrentEventDeliveryLease(executor, claim);
    const current = await executor.query<{
      progress: unknown;
      last_recorded_at: Date | null;
    }>(
      `SELECT d."progress",(SELECT MAX(a."occurred_at")
       FROM "_damat_event_activity" a WHERE a."delivery_id"=d."id"
       AND a."type"='progress') AS "last_recorded_at"
       FROM "_damat_event_deliveries" d WHERE d."id"=$1`,
      [claim.id],
    );
    const row = current.rows[0]!;
    const changed = JSON.stringify(row.progress) !== JSON.stringify(value);
    await executor.query(
      `UPDATE "_damat_event_deliveries" SET "progress"=$2::jsonb,
       "updated_at"=NOW() WHERE "id"=$1`,
      [claim.id, JSON.stringify(value)],
    );
    if (
      shouldRecordProgressActivity({
        changed,
        ...(row.last_recorded_at
          ? { lastRecordedAt: row.last_recorded_at }
          : {}),
        minimumIntervalMs,
      })
    ) {
      await appendEventActivity(executor, {
        eventId: claim.eventId,
        deliveryId: claim.id,
        consumer: claim.consumer,
        attemptNumber: claim.attemptCount,
        type: "progress",
        previousStatus: "running",
        nextStatus: "running",
        workerId: claim.workerId,
        leaseToken: claim.leaseToken,
        metadata: { ...metadata, value },
      });
    }
  });
}
