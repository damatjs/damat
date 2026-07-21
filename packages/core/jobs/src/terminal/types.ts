export interface PipelineJobBinding {
  runId: string;
  nodeExecutionId: string;
  pipeline: string;
}

export type JobTerminalStatus = "succeeded" | "dead_lettered" | "cancelled";

export type JobTerminalListener = (
  binding: PipelineJobBinding,
  status: JobTerminalStatus,
) => void | Promise<void>;
