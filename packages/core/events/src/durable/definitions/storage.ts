import { DEFAULT_DURABLE_EVENT_POLICY } from "./defaults";
import type {
  DurableConsumerDefinition,
  DurableConsumerOptions,
  ResolvedDurableEventPolicy,
} from "./types";

const REGISTRY = Symbol.for("damatjs.events.durableDefinitions");
export interface MutableDefinition {
  name: string;
  policy: ResolvedDurableEventPolicy;
  consumers: Map<string, MutableConsumerDefinition>;
  explicit: boolean;
}
export type MutableConsumerDefinition = DurableConsumerDefinition & {
  overrides: DurableConsumerOptions;
};
type GlobalRegistry = typeof globalThis & {
  [REGISTRY]?: Map<string, MutableDefinition>;
};

export function durableEventRegistry(): Map<string, MutableDefinition> {
  const storage = globalThis as GlobalRegistry;
  storage[REGISTRY] ??= new Map();
  return storage[REGISTRY];
}

export function createImplicitDefinition(name: string): MutableDefinition {
  const definition: MutableDefinition = {
    name,
    policy: { ...DEFAULT_DURABLE_EVENT_POLICY },
    consumers: new Map(),
    explicit: false,
  };
  durableEventRegistry().set(name, definition);
  return definition;
}
