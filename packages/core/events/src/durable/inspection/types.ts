import type {
  TimeRange,
  WorkerRecord,
  WorkControlActivity,
} from "@damatjs/durability";
import type { DurableEventActivity } from "../repositories";
import type {
  DurableEventDelivery,
  DurableEventDeliveryAttempt,
  DurableEventDeliveryStatus,
  DurableEventLog,
} from "../repositories";

export type EventOperationalView =
  "upcoming" | "processing" | "retrying" | "failed" | "completed";
export type EventLeaseState = "active" | "stale";
export type EventWorkerRecord = Omit<
  WorkerRecord,
  "application" | "deployment"
> & {
  application?: Record<string, unknown>;
  deployment?: Record<string, unknown>;
};

export interface DurableEventFilter {
  names?: string[];
  consumers?: string[];
  statuses?: DurableEventDeliveryStatus[];
  views?: EventOperationalView[];
  recovered?: boolean;
  workerId?: string;
  leaseState?: EventLeaseState;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
  created?: TimeRange;
  available?: TimeRange;
  started?: TimeRange;
  finished?: TimeRange;
  failed?: TimeRange;
  cursor?: string;
  limit?: number;
  now?: Date;
}

export interface EventSummary {
  id: string;
  name: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
  occurredAt: Date;
  availableAt: Date;
  routedAt?: Date;
  createdAt: Date;
  deliveryCounts: Partial<Record<DurableEventDeliveryStatus, number>>;
  views: EventOperationalView[];
  recovered: boolean;
}

export interface EventDeliveryDetail extends DurableEventDelivery {
  attempts: DurableEventDeliveryAttempt[];
  logs: DurableEventLog[];
  logsTruncated: boolean;
}

export interface DurableEventDetail extends EventSummary {
  deliveries: EventDeliveryDetail[];
  activity: DurableEventActivity[];
  workers: EventWorkerRecord[];
  controls: WorkControlActivity[];
  controlHistoryTruncated: boolean;
}
