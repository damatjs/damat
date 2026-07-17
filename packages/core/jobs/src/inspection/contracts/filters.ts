import type { TimeRange, WorkSummaryFilter } from "@damatjs/durability";
import type { JobRunStatus } from "../../repositories";

export type JobRunView =
  "upcoming" | "processing" | "retrying" | "failed" | "completed";

export type JobLeaseState = "active" | "stale" | "none";

export interface JobRunFilter {
  statuses?: JobRunStatus[];
  views?: JobRunView[];
  recovered?: boolean;
  queues?: string[];
  names?: string[];
  workerIds?: string[];
  leaseState?: JobLeaseState;
  available?: TimeRange;
  created?: TimeRange;
  started?: TimeRange;
  finished?: TimeRange;
  failed?: TimeRange;
  correlationIds?: string[];
  scheduleIds?: string[];
  deduplicationKeys?: string[];
  cursor?: string;
  limit?: number;
}

export type JobSummaryFilter = WorkSummaryFilter;
