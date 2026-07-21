import type {
  PipelineActionDefinition,
  PipelineReferenceSchema,
  PipelineWorkflowDefinition,
} from "./capability-types";

const KEY = Symbol.for("damatjs.pipelines.capabilities");
interface CapabilityRegistry {
  actions: Map<string, PipelineActionDefinition>;
  workflows: Map<string, PipelineWorkflowDefinition>;
  jobs: Map<string, PipelineReferenceSchema>;
  events: Map<string, PipelineReferenceSchema>;
}
type Storage = typeof globalThis & { [KEY]?: CapabilityRegistry };

export function capabilityRegistry(): CapabilityRegistry {
  const storage = globalThis as Storage;
  storage[KEY] ??= {
    actions: new Map(),
    workflows: new Map(),
    jobs: new Map(),
    events: new Map(),
  };
  return storage[KEY];
}
