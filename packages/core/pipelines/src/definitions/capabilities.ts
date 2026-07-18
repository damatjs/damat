import type { WorkflowDefinition } from "@damatjs/workflow-engine";
import { capabilityRegistry } from "./capability-storage";
import type {
  PipelineActionDefinition,
  PipelineCapabilitySchema,
  PipelineReferenceSchema,
  PipelineWorkflowDefinition,
  PipelineCapabilityCatalog,
} from "./capability-types";

export type * from "./capability-types";

export function definePipelineAction(
  definition: PipelineActionDefinition,
): PipelineActionDefinition {
  add(capabilityRegistry().actions, definition, "action");
  return definition;
}

export function registerPipelineWorkflow<I, O>(
  workflow: WorkflowDefinition<I, O>,
  schema: PipelineCapabilitySchema = {},
): PipelineWorkflowDefinition {
  const definition = {
    ...schema,
    name: workflow.name,
    workflow,
  } as PipelineWorkflowDefinition;
  add(capabilityRegistry().workflows, definition, "workflow");
  return definition;
}

export function registerPipelineJob(
  definition: PipelineReferenceSchema,
): PipelineReferenceSchema {
  add(capabilityRegistry().jobs, definition, "job");
  return definition;
}

export function registerPipelineEvent(
  definition: PipelineReferenceSchema,
): PipelineReferenceSchema {
  add(capabilityRegistry().events, definition, "event");
  return definition;
}

function add<T>(
  target: Map<string, T>,
  value: T & { name: string },
  kind: string,
): void {
  if (!value.name.trim()) throw new Error(`Pipeline ${kind} name is required`);
  if (target.has(value.name))
    throw new Error(`Pipeline ${kind} "${value.name}" is already registered`);
  target.set(value.name, value);
}

export const getPipelineAction = (name: string) =>
  capabilityRegistry().actions.get(name);
export const getPipelineWorkflow = (name: string) =>
  capabilityRegistry().workflows.get(name);
export const getPipelineJob = (name: string) =>
  capabilityRegistry().jobs.get(name);
export const getPipelineEvent = (name: string) =>
  capabilityRegistry().events.get(name);
export const getPipelineCapabilityCatalog = (): PipelineCapabilityCatalog => ({
  actions: [...capabilityRegistry().actions.values()],
  workflows: [...capabilityRegistry().workflows.values()].map(
    ({ workflow: _, ...value }) => value,
  ),
  jobs: [...capabilityRegistry().jobs.values()],
  events: [...capabilityRegistry().events.values()],
});
export const clearPipelineCapabilities = () => {
  const value = capabilityRegistry();
  value.actions.clear();
  value.workflows.clear();
  value.jobs.clear();
  value.events.clear();
};
