import type { DurabilityExecutor } from "../client/types";

export type WorkKind = "job" | "event" | "pipeline";
export type WorkerState = "active" | "stale" | "stopping" | "stopped";

export interface RegisterWorkerOptions {
  id: string;
  capabilities: string[];
  hostname: string;
  processId: number;
  application?: Record<string, unknown>;
  deployment?: Record<string, unknown>;
  concurrency: number;
  executor?: DurabilityExecutor;
}

export interface HeartbeatWorkerOptions {
  id: string;
  inFlight: number;
  concurrency?: number;
  executor?: DurabilityExecutor;
}

export interface WorkerIdentityOptions {
  id: string;
  executor?: DurabilityExecutor;
}

export interface ListWorkersOptions {
  ids?: string[];
  staleAfterMs?: number;
  now?: Date;
  executor?: DurabilityExecutor;
}

export interface WorkerRecord {
  id: string;
  capabilities: string[];
  hostname: string;
  processId: number;
  application: Record<string, unknown>;
  deployment: Record<string, unknown>;
  startedAt: Date;
  lastHeartbeatAt: Date;
  stoppingAt?: Date;
  stoppedAt?: Date;
  concurrency: number;
  inFlight: number;
  heartbeatAgeMs: number;
  state: WorkerState;
}
