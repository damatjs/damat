import type { EventWakeupRedis } from "../wakeup/types";
import type { DurabilityCoordinator } from "@damatjs/durability";

const TIMER_MAX = 2_147_483_647;

export interface DurableEventRouterOptions {
  pollIntervalMs?: number;
  retryIntervalMs?: number;
  batchSize?: number;
  wakeupRedis?: EventWakeupRedis;
  coordinator?: DurabilityCoordinator;
}

export type ResolvedRouterOptions = Required<
  Omit<DurableEventRouterOptions, "wakeupRedis" | "coordinator">
> &
  Pick<DurableEventRouterOptions, "wakeupRedis" | "coordinator">;

export function resolveRouterOptions(
  options: DurableEventRouterOptions,
): ResolvedRouterOptions {
  const resolved = {
    ...options,
    pollIntervalMs: options.pollIntervalMs ?? 5_000,
    retryIntervalMs: options.retryIntervalMs ?? 1_000,
    batchSize: options.batchSize ?? 100,
  };
  validate("pollIntervalMs", resolved.pollIntervalMs);
  validate("retryIntervalMs", resolved.retryIntervalMs);
  validate("batchSize", resolved.batchSize, 1_000);
  return resolved;
}

function validate(name: string, value: number, max = TIMER_MAX) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} must be a positive safe integer`);
  }
}
