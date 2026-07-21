import type { DurabilityExecutor, JsonValue } from "@damatjs/durability";
import { eventExecutor } from "./executor";
import {
  mapDurableEventDelivery,
  type DurableEventDeliveryRow,
} from "./delivery-mappers";

export type DurableEventDeliveryStatus =
  | "pending"
  | "running"
  | "retry_wait"
  | "succeeded"
  | "dead_lettered"
  | "cancelled";

export interface DurableEventDelivery {
  id: string;
  eventId: string;
  consumer: string;
  status: DurableEventDeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  availableAt: Date;
  retentionAt?: Date;
  leaseOwner?: string;
  leaseToken?: string;
  leaseExpiresAt?: Date;
  heartbeatAt?: Date;
  progress?: JsonValue;
  result?: JsonValue;
  lastError?: Record<string, unknown>;
  cancellationRequestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export async function getDurableEventDelivery(
  id: string,
  executor?: DurabilityExecutor,
): Promise<DurableEventDelivery | undefined> {
  const result = await eventExecutor(executor).query<DurableEventDeliveryRow>(
    `SELECT * FROM "_damat_event_deliveries" WHERE "id"=$1`,
    [id],
  );
  return result.rows[0] ? mapDurableEventDelivery(result.rows[0]) : undefined;
}

export async function listDurableEventDeliveries(
  eventId: string,
  executor?: DurabilityExecutor,
): Promise<DurableEventDelivery[]> {
  const result = await eventExecutor(executor).query<DurableEventDeliveryRow>(
    `SELECT * FROM "_damat_event_deliveries"
     WHERE "event_id"=$1 ORDER BY "consumer","id"`,
    [eventId],
  );
  return result.rows.map(mapDurableEventDelivery);
}
