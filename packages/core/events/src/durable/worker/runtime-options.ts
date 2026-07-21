import type { EventWakeupRedis } from "../wakeup/types";
import type { DurabilityCoordinator } from "@damatjs/durability";
import type {
  EventConsumerIdentity,
  EventDeliveryContextOptions,
} from "./types";
import { resolveExecutionOptions } from "./execution-options";
import {
  validateEventWorkerIdentity,
  validateResolvedEventWorkerOptions,
} from "./runtime-validation";

export interface DurableEventWorkerOptions extends EventDeliveryContextOptions {
  consumers: EventConsumerIdentity[];
  workerId?: string;
  concurrency?: number;
  pollIntervalMs?: number;
  leaseMs?: number;
  heartbeatIntervalMs?: number;
  registryHeartbeatIntervalMs?: number;
  retryIntervalMs?: number;
  reconcileIntervalMs?: number;
  reconcileBatchSize?: number;
  retentionIntervalMs?: number;
  wakeupRedis?: EventWakeupRedis;
  coordinator?: DurabilityCoordinator;
  cleanupSharedIdempotency?: boolean;
  batchHeartbeats?: boolean;
}

export type ResolvedEventWorkerOptions = DurableEventWorkerOptions & {
  concurrency: number;
  pollIntervalMs: number;
  leaseMs: number;
  heartbeatIntervalMs: number;
  registryHeartbeatIntervalMs: number;
  retryIntervalMs: number;
  reconcileIntervalMs: number;
  reconcileBatchSize: number;
  retentionIntervalMs: number;
  cleanupSharedIdempotency: boolean;
};

export function resolveEventWorkerOptions(
  options: DurableEventWorkerOptions,
): ResolvedEventWorkerOptions {
  validateEventWorkerIdentity(options);
  const execution = resolveExecutionOptions(options);
  const consumers = [
    ...new Map(
      options.consumers.map((item) => [
        JSON.stringify([item.event, item.consumer]),
        item,
      ]),
    ).values(),
  ];
  if (consumers.some(({ event, consumer }) => !event || !consumer)) {
    throw new Error("event and consumer cannot be empty");
  }
  const resolved = {
    ...execution,
    consumers,
    concurrency: options.concurrency ?? 1,
    pollIntervalMs: options.pollIntervalMs ?? 5_000,
    leaseMs: options.leaseMs ?? 30_000,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? 10_000,
    registryHeartbeatIntervalMs: options.registryHeartbeatIntervalMs ?? 30_000,
    retryIntervalMs: options.retryIntervalMs ?? 1_000,
    reconcileIntervalMs: options.reconcileIntervalMs ?? 5_000,
    reconcileBatchSize: options.reconcileBatchSize ?? 100,
    retentionIntervalMs: options.retentionIntervalMs ?? 3_600_000,
    cleanupSharedIdempotency: options.cleanupSharedIdempotency ?? true,
  };
  validateResolvedEventWorkerOptions(resolved);
  return resolved;
}
