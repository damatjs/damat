import type { WorkLogLevel } from "@damatjs/durability";

export interface DurableEventLog {
  id: string;
  eventId: string;
  deliveryId: string;
  attemptNumber: number;
  consumer: string;
  timestamp: Date;
  level: WorkLogLevel;
  message: string;
  context: Record<string, unknown>;
  sequence: number;
}
