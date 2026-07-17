import type { ResolvedDurableEventPolicy } from "./types";

export const DEFAULT_DURABLE_EVENT_POLICY: ResolvedDurableEventPolicy = {
  version: 1,
  maxAttempts: 3,
  backoffMs: 1_000,
  backoffMultiplier: 2,
  retentionMs: 604_800_000,
};
