import type { DurabilityExecutor } from "@damatjs/durability";

export interface DurableEventRecord {
  id: string;
  name: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  policyVersion: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retentionMs: number;
  idempotencyKey?: string;
  correlationId?: string;
  causationId?: string;
  occurredAt: Date;
  availableAt: Date;
  routedAt?: Date;
  retentionAt: Date;
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
  retentionMs: number;
  idempotencyKey?: string;
  correlationId?: string;
  causationId?: string;
  occurredAt: Date;
  availableAt: Date;
  retentionAt: Date;
}

export interface DurableEventActivity {
  id: string;
  eventId: string;
  type: string;
  occurredAt: Date;
  metadata: Record<string, unknown>;
  actor: Record<string, unknown>;
}

export interface ListDurableEventsOptions {
  name?: string;
  limit?: number;
  executor?: DurabilityExecutor;
}
