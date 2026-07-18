import type { JobRunContext } from "@damatjs/jobs";
import type { WorkflowDefinition } from "@damatjs/workflow-engine";

export interface PipelineCapabilitySchema {
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  description?: string;
  hidden?: boolean;
}

export interface PipelineActionContext extends JobRunContext {
  pipelineRunId: string;
  nodeExecutionId: string;
  nodeId: string;
}

export interface PipelineActionDefinition extends PipelineCapabilitySchema {
  name: string;
  handler(
    input: unknown,
    context: PipelineActionContext,
  ): unknown | Promise<unknown>;
}

export interface PipelineWorkflowDefinition extends PipelineCapabilitySchema {
  name: string;
  workflow: WorkflowDefinition<unknown, unknown>;
}

export interface PipelineReferenceSchema extends PipelineCapabilitySchema {
  name: string;
}

export interface PipelineCapabilityCatalog {
  actions: PipelineActionDefinition[];
  workflows: Array<Omit<PipelineWorkflowDefinition, "workflow">>;
  jobs: PipelineReferenceSchema[];
  events: PipelineReferenceSchema[];
}
