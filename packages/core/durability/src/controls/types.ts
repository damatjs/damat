import type { DurabilityExecutor } from "../client/types";
import type { WorkKind } from "../workers/types";

export interface WorkActor {
  id: string;
  type: "user" | "service" | "system";
  metadata?: Record<string, unknown>;
}

export interface WorkControlIdentity {
  kind: WorkKind;
  scope: string;
  executor?: DurabilityExecutor;
}

export interface ChangeWorkControlOptions extends WorkControlIdentity {
  reason?: string;
  actor: WorkActor;
}

export interface WorkControl {
  kind: WorkKind;
  scope: string;
  paused: boolean;
  reason?: string;
  actor: WorkActor;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkControlActivity {
  id: string;
  kind: WorkKind;
  scope: string;
  action: "paused" | "resumed";
  reason?: string;
  actor: WorkActor;
  createdAt: Date;
}

export interface ListWorkControlActivityOptions extends WorkControlIdentity {
  limit?: number;
}

export type MaintenanceStatus = "requested" | "completed" | "failed";

export interface RecordMaintenanceActivityOptions {
  operation: string;
  kind?: WorkKind;
  scope?: string;
  status: MaintenanceStatus;
  actor: WorkActor;
  details?: Record<string, unknown>;
  completedAt?: Date;
  executor?: DurabilityExecutor;
}

export interface MaintenanceActivity {
  id: string;
  operation: string;
  kind?: WorkKind;
  scope?: string;
  status: MaintenanceStatus;
  actor: WorkActor;
  details: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}
