import type { JsonValue } from "@damatjs/durability";
import type { JobRunStatus } from "./run-types";

export interface JobAttempt {
  id: string;
  runId: string;
  attemptNumber: number;
  workerId: string;
  leaseToken: string;
  startedAt: Date;
  availableAt?: Date;
  waitMs?: number;
  heartbeatAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  result?: JsonValue;
  outcome?: string;
  error?: Record<string, unknown>;
}

export interface JobActivity {
  id: string;
  runId: string;
  attemptNumber?: number;
  type: string;
  previousStatus?: JobRunStatus;
  nextStatus?: JobRunStatus;
  workerId?: string;
  leaseToken?: string;
  occurredAt: Date;
  reason?: string;
  durationMs?: number;
  metadata: Record<string, unknown>;
  actor: Record<string, unknown>;
}

export interface JobLog {
  id: string;
  runId: string;
  attemptNumber: number;
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context: Record<string, unknown>;
  workerId?: string;
  correlationId?: string;
  traceId?: string;
  sequence: number;
}
