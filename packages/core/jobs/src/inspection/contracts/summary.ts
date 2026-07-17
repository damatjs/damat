import type { JobRunStatus } from "../../repositories";
import type { VisibleWorkerRecord } from "./records";

export interface DurationDistribution {
  count: number;
  averageMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export interface JobThroughputBucket {
  bucketStart: Date;
  queue: string;
  name: string;
  succeeded: number;
  failed: number;
  cancelled: number;
}

export type JobWorkerSummaryRecord = VisibleWorkerRecord;

export interface JobFailureGroup {
  queue: string;
  name: string;
  message: string;
  count: number;
}

export interface JobOperationalSummary {
  statusCounts: Record<JobRunStatus, number>;
  activityCounts: Record<string, number>;
  throughput: JobThroughputBucket[];
  processingDuration: DurationDistribution;
  waitingDuration: DurationDistribution;
  oldestWaitMs?: number;
  nextWorkAt?: Date;
  leases: { active: number; stale: number };
  workers: {
    records: JobWorkerSummaryRecord[];
    active: number;
    stale: number;
    concurrency: number;
    inFlight: number;
    oldestHeartbeatMs: number;
  };
  deadLetters: { total: number; groups: JobFailureGroup[] };
}
