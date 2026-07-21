import type { DurabilityExecutor } from "@damatjs/durability";

export interface ReconcileOptions {
  limit?: number;
  queue?: string;
  executor?: DurabilityExecutor;
}

export function reconcileLimit(value = 100): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("reconciliation limit must be a positive safe integer");
  }
  return Math.min(value, 500);
}
