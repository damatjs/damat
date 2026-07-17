import { resolveConsumerOptions } from "./policy";
import { durableEventRegistry } from "./storage";

export interface ConsumerSnapshotBase {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export function getDurableConsumerSnapshots(
  name: string,
  base: ConsumerSnapshotBase,
) {
  const definition = durableEventRegistry().get(name);
  if (!definition) return [];
  return [...definition.consumers.values()].map((consumer) => ({
    name: consumer.name,
    handler: consumer.handler,
    options: resolveConsumerOptions(consumer.overrides, {
      ...base,
      version: 1,
      retentionMs: 0,
    }),
  }));
}
