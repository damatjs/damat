import type { DurabilityExecutor } from "../client/types";
import type { AccelerationMode } from "../coordinator";

export type DurableResourceKind = "job" | "event" | "worker" | "control";

export interface DurableInvalidation {
  kind: DurableResourceKind;
  resourceId?: string;
  scope?: string;
  revision: string;
}

export interface AccelerationSignalInput {
  topic: string;
  kind: DurableResourceKind;
  resourceId?: string;
  scope?: string;
  payload?: Record<string, unknown>;
  availableAt?: Date;
  executor?: DurabilityExecutor;
}

export interface AccelerationSignal extends DurableInvalidation {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
  availableAt: Date;
  claimToken: string;
}

export interface AccelerationHealth {
  mode: AccelerationMode;
  lastSuccessfulPublication?: Date;
  pendingOutboxCount: number;
  projectionCheckpoint?: string;
  lastRebuildAt?: Date;
  fallbackPollIntervalMs: number;
}

export interface AccelerationActor {
  id: string;
  type: "user" | "service" | "system";
  reason: string;
}
