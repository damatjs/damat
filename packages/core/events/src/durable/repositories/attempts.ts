import type { DurabilityExecutor, JsonValue } from "@damatjs/durability";
import { eventExecutor } from "./executor";
import {
  mapEventDeliveryAttempt,
  type EventDeliveryAttemptRow,
} from "./attempt-mappers";

export interface DurableEventDeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  workerId: string;
  leaseToken: string;
  startedAt: Date;
  availableAt?: Date;
  waitMs?: number;
  heartbeatAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  result?: JsonValue;
  outcome?: "succeeded" | "retry_wait" | "dead_lettered" | "cancelled" | "lost";
  error?: Record<string, unknown>;
}

export async function listDurableEventDeliveryAttempts(
  deliveryId: string,
  executor?: DurabilityExecutor,
): Promise<DurableEventDeliveryAttempt[]> {
  const result = await eventExecutor(executor).query<EventDeliveryAttemptRow>(
    `SELECT * FROM "_damat_event_delivery_attempts"
     WHERE "delivery_id"=$1 ORDER BY "attempt_number"`,
    [deliveryId],
  );
  return result.rows.map(mapEventDeliveryAttempt);
}

export async function listEventDeliveryAttemptsBatch(
  deliveryIds: string[],
  executor: DurabilityExecutor,
): Promise<DurableEventDeliveryAttempt[]> {
  const result = await executor.query<EventDeliveryAttemptRow>(
    `SELECT * FROM "_damat_event_delivery_attempts"
     WHERE "delivery_id"=ANY($1::uuid[])
     ORDER BY "delivery_id","attempt_number"`,
    [deliveryIds],
  );
  return result.rows.map(mapEventDeliveryAttempt);
}
