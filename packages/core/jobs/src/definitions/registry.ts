import { DEFAULT_JOB_OPTIONS } from "./defaults";
import type {
  JobDefinition,
  JobHandler,
  JobName,
  JobOptions,
  JobPayload,
} from "./types";

const REGISTRY = Symbol.for("damatjs.jobs.durableDefinitions");
type GlobalRegistry = typeof globalThis & {
  [REGISTRY]?: Map<string, JobDefinition>;
};

function registry(): Map<string, JobDefinition> {
  const storage = globalThis as GlobalRegistry;
  storage[REGISTRY] ??= new Map();
  return storage[REGISTRY];
}

export function defineJob<K extends JobName>(
  name: K,
  handler: JobHandler<JobPayload<K>>,
  options: JobOptions = {},
): JobDefinition<JobPayload<K>> {
  if (registry().has(name)) {
    throw new Error(`Job "${name}" is already defined`);
  }
  const definition: JobDefinition<JobPayload<K>> = {
    name,
    handler,
    options: { ...DEFAULT_JOB_OPTIONS, ...options },
  };
  registry().set(name, definition as JobDefinition);
  return definition;
}

export function getJobDefinition(name: string): JobDefinition | undefined {
  return registry().get(name);
}

export function getAllJobDefinitions(): JobDefinition[] {
  return [...registry().values()];
}

export function clearJobDefinitions(): void {
  registry().clear();
}
