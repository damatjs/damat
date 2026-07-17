import type { JsonValue } from "@damatjs/durability";

export interface DurableEventDeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  workerId: string;
  leaseToken: string;
  startedAt: Date;
  finishedAt?: Date;
  result?: JsonValue;
  error?: Record<string, unknown>;
}
