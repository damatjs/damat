import type { WorkControlActivity, WorkerRecord } from "@damatjs/durability";
import type {
  JobActivity,
  JobAttempt,
  JobLog,
  JobRunStatus,
  JobSchedule,
} from "../../repositories";
import type { JobRunView } from "./filters";

export interface JobLeaseSummary {
  workerId: string;
  leaseToken: string;
  expiresAt?: Date;
  heartbeatAt?: Date;
  state: "active" | "stale";
}

export interface JobRunSummary {
  id: string;
  name: string;
  queue: string;
  status: JobRunStatus;
  view: JobRunView;
  recovered: boolean;
  metadata?: Record<string, unknown>;
  payload?: unknown;
  priority: number;
  availableAt: Date;
  attemptCount: number;
  maxAttempts: number;
  currentLease?: JobLeaseSummary;
  correlationId?: string;
  scheduleId?: string;
  deduplicationKey?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type VisibleJobSchedule = Omit<JobSchedule, "payload" | "metadata"> & {
  payload?: unknown;
  metadata?: Record<string, unknown>;
};

export type VisibleWorkerRecord = Omit<
  WorkerRecord,
  "application" | "deployment"
> & {
  application?: Record<string, unknown>;
  deployment?: Record<string, unknown>;
};

export interface JobRunDetail extends JobRunSummary {
  progress?: unknown;
  result?: unknown;
  lastError?: Record<string, unknown>;
  attempts: JobAttempt[];
  activity: JobActivity[];
  logs: JobLog[];
  leaseHistory: JobLeaseSummary[];
  workers: VisibleWorkerRecord[];
  schedule?: VisibleJobSchedule;
  scheduleActivity: JobScheduleActivity[];
  controlActivity: WorkControlActivity[];
  controlHistoryTruncated: boolean;
  logsTruncated: boolean;
}

export interface JobScheduleActivity {
  id: string;
  type: string;
  occurredAt: Date;
  metadata: Record<string, unknown>;
  actor: Record<string, unknown>;
}
