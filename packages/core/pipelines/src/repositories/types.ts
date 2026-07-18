import type { PipelineManifest } from "../definitions";
import type { PipelineRunStatus } from "./rows";
import type { PipelineNodeStatus } from "./node-rows";

export interface StoredPipelineVersion {
  id: string;
  definitionId: string;
  name: string;
  source: "code" | "web";
  sourceVersion: string;
  checksum: string;
  manifest: PipelineManifest;
  active: boolean;
  createdAt: Date;
}

export interface PipelineRun {
  id: string;
  definitionId: string;
  versionId: string;
  name: string;
  version: string;
  status: PipelineRunStatus;
  input: unknown;
  output?: unknown;
  error?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  trigger: Record<string, unknown>;
  correlationId?: string;
  idempotencyKey?: string;
  parentRunId?: string;
  parentNodeExecutionId?: string;
  retentionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface PipelineNodeExecution {
  id: string;
  runId: string;
  nodeId: string;
  activationKey: string;
  phase: "forward" | "compensation";
  kind: string;
  status: PipelineNodeStatus;
  input?: unknown;
  output?: unknown;
  error?: Record<string, unknown>;
  jobRunId?: string;
  childRunId?: string;
  availableAt: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
