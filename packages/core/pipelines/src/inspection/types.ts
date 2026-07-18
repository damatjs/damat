import type {
  CursorPage,
  DurabilityClient,
  InspectionVisibility,
  RedactionOptions,
  WorkActor,
} from "@damatjs/durability";
import type { PipelineNodeExecution, PipelineRun } from "../repositories";

export interface PipelineInspectionOptions {
  cursorSigningKey: string | Uint8Array;
  visibility?: InspectionVisibility;
  redaction?: RedactionOptions;
  client?: DurabilityClient;
}

export interface PipelineRunFilter {
  status?: string;
  name?: string;
  limit?: number;
  cursor?: string;
}

export type PipelineRunSummary = Omit<
  PipelineRun,
  "input" | "output" | "error"
> & {
  input?: unknown;
  output?: unknown;
  error?: Record<string, unknown>;
};

export interface PipelineRunDetail extends PipelineRunSummary {
  manifest: Record<string, unknown>;
  layout?: Record<string, unknown>;
  nodes: PipelineNodeExecution[];
  transitions: unknown[];
  signals: unknown[];
  activity: unknown[];
  jobs: Record<
    string,
    { attempts: unknown[]; logs: unknown[]; activity: unknown[] }
  >;
}

export interface PipelineOperationalSummary {
  statuses: Record<string, number>;
  nodeStatuses: Record<string, number>;
  averageDurationMs?: number;
}

export interface PipelineInspectionClient {
  listRuns(filter?: PipelineRunFilter): Promise<CursorPage<PipelineRunSummary>>;
  getRun(id: string): Promise<PipelineRunDetail | null>;
  getSummary(): Promise<PipelineOperationalSummary>;
  pause(id: string, options: PipelineAdminOptions): Promise<void>;
  resume(id: string, options: PipelineAdminOptions): Promise<void>;
  cancel(id: string, options: PipelineAdminOptions): Promise<void>;
  retryNode(
    id: string,
    nodeExecutionId: string,
    options: PipelineAdminOptions,
  ): Promise<void>;
  runRetention(
    options: import("../retention").PipelineRetentionOptions,
  ): Promise<import("../retention").PipelineRetentionResult>;
}

export interface PipelineAdminOptions {
  actor: WorkActor;
  reason: string;
  idempotencyKey: string;
}
