import type { DurableConsumerOptions, DurableEventPolicy } from "./types";

export function validateDurableName(name: string, label = "event"): void {
  if (!name.trim()) throw new Error(`Durable ${label} name is required`);
  if (name.includes("*")) {
    throw new Error("Durable event wildcards are not supported");
  }
}

export function validateConsumerOptions(options: DurableConsumerOptions): void {
  validateDurablePolicy(options);
}

export function validateDurablePolicy(policy: DurableEventPolicy): void {
  positiveInteger(policy.version, "version");
  positiveInteger(policy.maxAttempts, "maxAttempts");
  nonNegativeInteger(policy.backoffMs, "backoffMs");
  if (policy.retentionMs !== "forever") {
    nonNegativeInteger(policy.retentionMs, "retentionMs");
  }
  if (
    policy.backoffMultiplier !== undefined &&
    (!Number.isFinite(policy.backoffMultiplier) || policy.backoffMultiplier < 1)
  ) {
    throw new Error("backoffMultiplier must be a finite number at least 1");
  }
}

function positiveInteger(value: number | undefined, label: string): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
    throw new Error(`${label} must be a positive safe integer`);
  }
}

function nonNegativeInteger(value: number | undefined, label: string): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }
}
