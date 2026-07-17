import type { JsonValue } from "@damatjs/durability";

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
  availableAt: Date;
  progress?: JsonValue;
  result?: JsonValue;
}
