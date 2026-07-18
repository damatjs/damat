import type { DurabilityExecutor, RetentionDuration } from "@damatjs/durability";

export interface DurableEventRecord {
  id: string;
  name: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  policyVersion: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retentionMs: RetentionDuration;
  idempotencyKey?: string;
  correlationId?: string;
  causationId?: string;
  occurredAt: Date;
  availableAt: Date;
  routedAt?: Date;
  retentionAt?: Date;
  createdAt: Date;
}

export interface NewDurableEvent {
  id: string;
  name: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  policyVersion: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retentionMs: RetentionDuration;
  idempotencyKey?: string;
  correlationId?: string;
  causationId?: string;
  occurredAt: Date;
  availableAt: Date;
  retentionAt?: Date;
}

export interface DurableEventActivity {
  id: string;
  eventId: string;
  deliveryId?: string;
  consumer?: string;
  attemptNumber?: number;
  type: string;
  previousStatus?: string;
  nextStatus?: string;
  workerId?: string;
  leaseToken?: string;
  reason?: string;
  durationMs?: number;
  occurredAt: Date;
  metadata: Record<string, unknown>;
  actor: Record<string, unknown>;
}

export interface ListDurableEventsOptions {
  name?: string;
  limit?: number;
  executor?: DurabilityExecutor;
}
