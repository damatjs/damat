import type { DurabilityClient, WorkActor } from "@damatjs/durability";

export interface PipelineRetentionOptions {
  actor: WorkActor;
  reason: string;
  idempotencyKey: string;
  batchSize?: number;
  terminalBefore?: Date;
  client?: DurabilityClient;
}

export interface PipelineRetentionResult {
  deletedRuns: number;
  deletedJobs: number;
}
