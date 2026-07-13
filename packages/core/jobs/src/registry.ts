import {
  DEFAULT_JOB_OPTIONS,
  type JobDefinition,
  type JobHandler,
  type JobName,
  type JobOptions,
  type JobPayload,
} from "./types";

// Definitions live on globalThis (like the event bus and PoolManager) so a
// linked dev copy of this package next to an installed one still shares one
// registry — a worker must see every module's definitions.
const REGISTRY_KEY = Symbol.for("damatjs.jobs.registry");

function registry(): Map<string, JobDefinition> {
  const g = globalThis as Record<
    symbol,
    Map<string, JobDefinition> | undefined
  >;
  if (!g[REGISTRY_KEY]) g[REGISTRY_KEY] = new Map();
  return g[REGISTRY_KEY];
}

/**
 * Register a job the worker can execute. Definitions are code, not data —
 * every process that runs a worker must import the modules that define its
 * jobs (the framework's module init does this for installed modules).
 */
export function defineJob<K extends JobName>(
  name: K,
  handler: JobHandler<JobPayload<K>>,
  options: JobOptions = {},
): JobDefinition<JobPayload<K>> {
  if (registry().has(name)) {
    throw new Error(
      `Job "${name}" is already defined — job names must be unique`,
    );
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

/** Drop every definition (tests). */
export function clearJobDefinitions(): void {
  registry().clear();
}
