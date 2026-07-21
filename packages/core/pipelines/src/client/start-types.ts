import type { DurabilityExecutor, WorkActor } from "@damatjs/durability";

export interface StartPipelineOptions {
  versionId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  trigger?: Record<string, unknown>;
  parentRunId?: string;
  parentNodeExecutionId?: string;
  actor?: WorkActor;
  executor?: DurabilityExecutor;
}

export interface SignalPipelineOptions {
  idempotencyKey: string;
  actor: WorkActor;
  reason: string;
  executor?: DurabilityExecutor;
}
