import { encodeEventConsumerScope } from "./scope";
import type { EventConsumerIdentity } from "./types";
import type { DurabilityExecutor } from "@damatjs/durability";

export interface EventReconcileOptions {
  limit?: number;
  consumers?: EventConsumerIdentity[];
  executor?: DurabilityExecutor;
}

export function resolveReconcileLimit(limit = 100): number {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw new Error("reconcile limit must be an integer between 1 and 1000");
  }
  return limit;
}

export function encodeReconcileConsumers(
  consumers?: EventConsumerIdentity[],
): string | null {
  if (!consumers) return null;
  const unique = new Map(
    consumers.map((item) => [
      encodeEventConsumerScope(item.event, item.consumer),
      item,
    ]),
  );
  return JSON.stringify([...unique.values()]);
}
