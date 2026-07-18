import type { JobRunContext } from "@damatjs/jobs";
import type { WorkflowExecutionObserver } from "@damatjs/workflow-engine";

export function pipelineWorkflowObserver(
  context: JobRunContext,
): WorkflowExecutionObserver {
  return {
    onEvent: async (event) => {
      await context.log("info", "Workflow activity", { workflowEvent: event });
    },
  };
}
