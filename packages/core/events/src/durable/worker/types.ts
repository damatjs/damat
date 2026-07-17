import type {
  DurabilityClient,
  JsonValue,
  RedactionOptions,
  WorkLogLimits,
} from "@damatjs/durability";

export interface EventConsumerIdentity {
  event: string;
  consumer: string;
}

export interface ClaimedEventDelivery {
  id: string;
  eventId: string;
  event: string;
  consumer: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  attemptCount: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retentionAt: Date;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: Date;
}

export interface ClaimEventDeliveriesOptions {
  consumers: EventConsumerIdentity[];
  workerId: string;
  limit: number;
  leaseMs: number;
  client?: DurabilityClient;
}

export interface EventDeliveryContextOptions {
  progressMinimumIntervalMs?: number;
  logLimits?: WorkLogLimits;
  redaction?: RedactionOptions;
}

export interface ExecuteEventDeliveryOptions extends EventDeliveryContextOptions {
  leaseMs?: number;
  heartbeatIntervalMs?: number;
}

export type EventDeliveryResult = JsonValue | undefined;
