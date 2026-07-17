import type {
  BoundedRetentionRequest,
  CursorPage,
  DurabilityClient,
  InspectionVisibility,
  RedactionOptions,
  WorkActor,
} from "@damatjs/durability";
import type { JobRun, JobSchedule } from "../../repositories";
import type { JobRetentionResult } from "../../worker/retention";
import type { JobRunFilter, JobSummaryFilter } from "./filters";
import type { JobRunDetail, JobRunSummary } from "./records";
import type { JobOperationalSummary } from "./summary";

export interface JobInspectionOptions {
  cursorSigningKey: string | Uint8Array;
  visibility?: InspectionVisibility;
  redaction?: RedactionOptions;
  staleAfterMs?: number;
  client?: DurabilityClient;
}

export interface JobInspectionClient {
  listRuns(filter?: JobRunFilter): Promise<CursorPage<JobRunSummary>>;
  getRun(id: string): Promise<JobRunDetail | null>;
  getSummary(filter: JobSummaryFilter): Promise<JobOperationalSummary>;
  cancel(id: string, actor: WorkActor, reason?: string): Promise<JobRun>;
  retry(id: string, actor: WorkActor): Promise<JobRun>;
  pauseQueue(queue: string, actor: WorkActor, reason?: string): Promise<void>;
  resumeQueue(queue: string, actor: WorkActor): Promise<void>;
  enableSchedule(id: string, actor: WorkActor): Promise<JobSchedule>;
  disableSchedule(
    id: string,
    actor: WorkActor,
    reason?: string,
  ): Promise<JobSchedule>;
  runRetention(
    request: BoundedRetentionRequest,
    actor: WorkActor,
  ): Promise<JobRetentionResult>;
}
