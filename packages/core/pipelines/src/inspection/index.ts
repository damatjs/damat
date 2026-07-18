import { cancelPipelineRun } from "./admin-cancel";
import { retryPipelineNode } from "./admin-retry";
import { changePipelinePause } from "./admin-state";
import { resolvePipelineInspectionOptions } from "./config";
import { getInspectedPipelineRun } from "./detail";
import { listInspectedPipelineRuns } from "./list";
import { getPipelineOperationalSummary } from "./summary";
import type {
  PipelineInspectionClient,
  PipelineInspectionOptions,
} from "./types";
import { runPipelineRetention } from "../retention";

export function createPipelineInspectionClient(
  input: PipelineInspectionOptions,
): PipelineInspectionClient {
  const options = resolvePipelineInspectionOptions(input);
  return {
    listRuns: (filter = {}) => listInspectedPipelineRuns(filter, options),
    getRun: (id) => getInspectedPipelineRun(id, options),
    getSummary: () => getPipelineOperationalSummary(options),
    pause: (id, control) => changePipelinePause(id, true, control),
    resume: (id, control) => changePipelinePause(id, false, control),
    cancel: (id, control) => cancelPipelineRun(id, control),
    retryNode: (id, nodeId, control) => retryPipelineNode(id, nodeId, control),
    runRetention: (request) =>
      runPipelineRetention({ ...request, client: options.client }),
  };
}

export * from "./types";
