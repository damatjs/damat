import type { WorkSummaryFilter } from "@damatjs/durability";
import type { DurableEventDeliveryStatus } from "../repositories";
import type { EventWorkerRecord } from "./types";

export interface EventDurationDistribution {
  count: number;
  min?: number;
  p50?: number;
  p95?: number;
  p99?: number;
  max?: number;
}

export interface EventThroughputBucket {
  bucketStart: Date;
  event: string;
  consumer?: string;
  total: number;
  succeeded: number;
  failed: number;
  retried: number;
  cancelled: number;
  recovered: number;
}

export interface EventDeadLetterGroup {
  event: string;
  consumer: string;
  count: number;
  lastFailedAt?: Date;
}

export interface EventWorkerSummary {
  records: EventWorkerRecord[];
  concurrency: number;
  inFlight: number;
  available: number;
}

export interface EventOperationalSummary {
  range: WorkSummaryFilter;
  statusCounts: Partial<Record<DurableEventDeliveryStatus, number>>;
  activityCounts: Record<string, number>;
  throughput: EventThroughputBucket[];
  durationMs: EventDurationDistribution;
  waitingMs: EventDurationDistribution;
  oldestWaitMs?: number;
  nextWorkAt?: Date;
  leases: { active: number; stale: number };
  workers: EventWorkerSummary;
  deadLetters: EventDeadLetterGroup[];
}
