import { DEFAULT_DURABLE_EVENT_POLICY } from "./defaults";
import type {
  DurableConsumerOptions,
  DurableEventPolicy,
  ResolvedDurableConsumerOptions,
  ResolvedDurableEventPolicy,
} from "./types";
import { validateConsumerOptions, validateDurablePolicy } from "./validation";

export function resolveEventPolicy(
  policy: DurableEventPolicy = {},
  base = DEFAULT_DURABLE_EVENT_POLICY,
): ResolvedDurableEventPolicy {
  validateDurablePolicy(policy);
  return {
    version: policy.version ?? base.version,
    maxAttempts: policy.maxAttempts ?? base.maxAttempts,
    backoffMs: policy.backoffMs ?? base.backoffMs,
    backoffMultiplier: policy.backoffMultiplier ?? base.backoffMultiplier,
    retentionMs: policy.retentionMs ?? base.retentionMs,
  };
}

export function resolveConsumerOptions(
  options: DurableConsumerOptions,
  eventPolicy: ResolvedDurableEventPolicy,
): ResolvedDurableConsumerOptions {
  validateConsumerOptions(options);
  return {
    maxAttempts: options.maxAttempts ?? eventPolicy.maxAttempts,
    backoffMs: options.backoffMs ?? eventPolicy.backoffMs,
    backoffMultiplier:
      options.backoffMultiplier ?? eventPolicy.backoffMultiplier,
  };
}
