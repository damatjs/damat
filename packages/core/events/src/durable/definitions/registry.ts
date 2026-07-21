import type {
  DurableConsumerDefinition,
  DurableConsumerOptions,
  DurableEventDefinition,
  DurableEventHandler,
  DurableEventName,
  DurableEventPayload,
  DurableEventPolicy,
} from "./types";
import { resolveConsumerOptions, resolveEventPolicy } from "./policy";
import {
  createImplicitDefinition,
  durableEventRegistry as registry,
  type MutableConsumerDefinition,
  type MutableDefinition,
} from "./storage";
import { validateDurableName } from "./validation";

export function defineDurableEvent<K extends DurableEventName>(
  name: K,
  policy: DurableEventPolicy = {},
): DurableEventDefinition<DurableEventPayload<K>> {
  validateDurableName(name);
  const existing = registry().get(name);
  if (existing?.explicit) {
    throw new Error(`Durable event "${name}" is already defined`);
  }
  if (existing) {
    existing.policy = resolveEventPolicy(policy);
    existing.explicit = true;
    for (const consumer of existing.consumers.values()) {
      consumer.options = resolveConsumerOptions(
        consumer.overrides,
        existing.policy,
      );
    }
    return existing as DurableEventDefinition<DurableEventPayload<K>>;
  }
  const definition: MutableDefinition = {
    name,
    policy: resolveEventPolicy(policy),
    consumers: new Map(),
    explicit: true,
  };
  registry().set(name, definition);
  return definition as DurableEventDefinition<DurableEventPayload<K>>;
}

export function defineDurableEventHandler<K extends DurableEventName>(
  name: K,
  consumer: string,
  handler: DurableEventHandler<DurableEventPayload<K>>,
  options: DurableConsumerOptions = {},
): DurableConsumerDefinition<DurableEventPayload<K>> {
  validateDurableName(name);
  validateDurableName(consumer, "consumer");
  const definition = registry().get(name) ?? createImplicitDefinition(name);
  if (definition.consumers.has(consumer)) {
    throw new Error(
      `Durable consumer "${consumer}" is already defined for "${name}"`,
    );
  }
  const registered = {
    name: consumer,
    handler,
    options: resolveConsumerOptions(options, definition.policy),
    overrides: options,
  };
  definition.consumers.set(
    consumer,
    registered as unknown as MutableConsumerDefinition,
  );
  return registered as DurableConsumerDefinition<DurableEventPayload<K>>;
}

export const getDurableEventDefinition = (name: string) => registry().get(name);
export const getDurableEventConsumer = (name: string, consumer: string) =>
  registry().get(name)?.consumers.get(consumer);
export const getAllDurableEventDefinitions = () => [...registry().values()];
export const clearDurableEventDefinitions = () => registry().clear();
