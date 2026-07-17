import type { DurabilityExecutor, WorkLogLevel } from "@damatjs/durability";
import { eventExecutor } from "./executor";
import { mapDurableEventLog, type DurableEventLogRow } from "./log-mappers";

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
  workerId?: string;
  correlationId?: string;
  traceId?: string;
  sequence: number;
}

export async function listDurableEventLogs(
  deliveryId: string,
  executor?: DurabilityExecutor,
): Promise<DurableEventLog[]> {
  const result = await eventExecutor(executor).query<DurableEventLogRow>(
    `SELECT * FROM "_damat_event_logs" WHERE "delivery_id"=$1
     ORDER BY "attempt_number","sequence"`,
    [deliveryId],
  );
  return result.rows.map(mapDurableEventLog);
}

export async function listEventDeliveryLogsBatch(
  deliveryIds: string[],
  executor: DurabilityExecutor,
): Promise<DurableEventLog[]> {
  const result = await executor.query<DurableEventLogRow>(
    `SELECT * FROM "_damat_event_logs" WHERE "delivery_id"=ANY($1::uuid[])
     ORDER BY "delivery_id","attempt_number","sequence"`,
    [deliveryIds],
  );
  return result.rows.map(mapDurableEventLog);
}
