import { DEFAULT_DURABLE_EVENT_POLICY } from "../definitions/defaults";
import { getDurableEventDefinition } from "../definitions/registry";
import type { PublishDurableEventOptions } from "../definitions/types";
import type { NewDurableEvent } from "../repositories/types";
import { validateDurableName } from "../definitions/validation";

export function resolveDurableEvent(
  name: string,
  payload: unknown,
  options: PublishDurableEventOptions,
): NewDurableEvent {
  validateDurableName(name);
  validatePublishOptions(options);
  const policy =
    getDurableEventDefinition(name)?.policy ?? DEFAULT_DURABLE_EVENT_POLICY;
  const occurredAt = new Date();
  const availableAt =
    options.availableAt ??
    new Date(occurredAt.getTime() + (options.delayMs ?? 0));
  const retentionAt = policy.retentionMs === "forever"
    ? undefined
    : new Date(availableAt.getTime() + policy.retentionMs);
  if (retentionAt && Number.isNaN(retentionAt.getTime())) {
    throw new Error("Durable event retention timestamp is outside Date range");
  }
  return {
    id: crypto.randomUUID(),
    name,
    payload,
    metadata: options.metadata ?? {},
    policyVersion: policy.version,
    maxAttempts: policy.maxAttempts,
    backoffMs: policy.backoffMs,
    backoffMultiplier: policy.backoffMultiplier,
    retentionMs: policy.retentionMs,
    occurredAt,
    availableAt,
    ...(retentionAt ? { retentionAt } : {}),
    ...(options.idempotencyKey
      ? { idempotencyKey: options.idempotencyKey }
      : {}),
    ...(options.correlationId ? { correlationId: options.correlationId } : {}),
    ...(options.causationId ? { causationId: options.causationId } : {}),
  };
}

function validatePublishOptions(options: PublishDurableEventOptions): void {
  if (options.delayMs !== undefined && options.availableAt) {
    throw new Error("Use either delayMs or availableAt, not both");
  }
  if (
    options.delayMs !== undefined &&
    (!Number.isSafeInteger(options.delayMs) || options.delayMs < 0)
  ) {
    throw new Error("delayMs must be a non-negative safe integer");
  }
  if (
    options.availableAt !== undefined &&
    (!(options.availableAt instanceof Date) ||
      Number.isNaN(options.availableAt.getTime()))
  ) {
    throw new Error("availableAt must be a valid Date");
  }
  if (options.idempotencyKey !== undefined && !options.idempotencyKey.trim()) {
    throw new Error("idempotencyKey cannot be empty");
  }
}
