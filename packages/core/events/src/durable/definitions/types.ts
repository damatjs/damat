import type {
  DurabilityExecutor,
  JsonValue,
  withIdempotency,
  RetentionDuration,
} from "@damatjs/durability";

export interface DurableEventMap {}
export type DurableEventName = (keyof DurableEventMap & string) | (string & {});
export type DurableEventPayload<K extends string> =
  K extends keyof DurableEventMap ? DurableEventMap[K] : unknown;

export interface DurableEventPolicy {
  version?: number;
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  retentionMs?: RetentionDuration;
}

export type ResolvedDurableEventPolicy = Required<DurableEventPolicy>;
export type DurableEventHandler<T = unknown> = (
  payload: T,
  context: DurableEventHandlerContext,
) => unknown | Promise<unknown>;

export interface DurableEventHandlerContext {
  eventId: string;
  deliveryId: string;
  consumer: string;
  attemptNumber: number;
  maxAttempts: number;
  metadata: Record<string, unknown>;
  signal: AbortSignal;
  withIdempotency: typeof withIdempotency;
  progress(value: JsonValue, metadata?: Record<string, unknown>): Promise<void>;
  log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    context?: Record<string, unknown>,
  ): Promise<void>;
}

export interface DurableConsumerOptions {
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
}

export type ResolvedDurableConsumerOptions = Required<DurableConsumerOptions>;

export interface DurableConsumerDefinition<T = unknown> {
  name: string;
  handler: DurableEventHandler<T>;
  options: ResolvedDurableConsumerOptions;
}

export interface DurableEventDefinition<T = unknown> {
  name: string;
  policy: ResolvedDurableEventPolicy;
  consumers: ReadonlyMap<string, DurableConsumerDefinition<T>>;
}

export interface PublishDurableEventOptions {
  metadata?: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
  delayMs?: number;
  availableAt?: Date;
  executor?: DurabilityExecutor;
}
