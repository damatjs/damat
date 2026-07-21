export const PIPELINE_EXECUTOR_JOB = "damat.pipeline.execute-node";

export interface PipelineExecutorPayload {
  pipelineRunId: string;
  nodeExecutionId: string;
  nodeId: string;
  kind: "action" | "workflow";
  capability: string;
  input: unknown;
}
