import type { QueryResultRow } from "@damatjs/deps/pg";
import type { DurableEventLog } from "./logs";

export interface DurableEventLogRow extends QueryResultRow {
  id: string;
  event_id: string;
  delivery_id: string;
  attempt_number: number;
  consumer: string;
  timestamp: Date;
  level: DurableEventLog["level"];
  message: string;
  context: Record<string, unknown>;
  worker_id: string | null;
  correlation_id: string | null;
  trace_id: string | null;
  sequence: number;
}

export function mapDurableEventLog(row: DurableEventLogRow): DurableEventLog {
  return {
    id: String(row.id),
    eventId: row.event_id,
    deliveryId: row.delivery_id,
    attemptNumber: row.attempt_number,
    consumer: row.consumer,
    timestamp: row.timestamp,
    level: row.level,
    message: row.message,
    context: row.context,
    ...(row.worker_id ? { workerId: row.worker_id } : {}),
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.trace_id ? { traceId: row.trace_id } : {}),
    sequence: row.sequence,
  };
}
