import {
  clearJobTerminalListener,
  configureJobTerminalListener,
} from "@damatjs/jobs/pipeline-integration";
import {
  clearPipelineRuntimeBindings,
  configurePipelineDefaults,
  publishPipelineWakeup,
  registerPipelineExecutorJob,
  syncPipelineDefinitions,
  getAllPipelineDefinitions,
  pipelineCapabilityErrors,
  validateOperationalLimits,
} from "@damatjs/pipelines";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";

export { initializePipelines } from "./pipelineWorkers";

export async function initializePipelineDefinitions(
  config: AppConfig,
  instances: ServiceInstances,
): Promise<void> {
  const pipelines = config.services?.pipelines;
  if (!pipelines) return;
  configurePipelineDefaults({
    ...(pipelines.retentionMs !== undefined
      ? { retentionMs: pipelines.retentionMs }
      : {}),
    jobs: Boolean(config.services?.jobs),
    events: Boolean(config.services?.events?.durable),
  });
  registerPipelineExecutorJob(pipelines.queue ?? "damat-pipelines");
  for (const definition of getAllPipelineDefinitions()) {
    validateOperationalLimits(
      definition.manifest,
      pipelines.maxNodeActivationsPerRun ?? 10_000,
      pipelines.maxFanOut ?? 1_000,
    );
    const errors = pipelineCapabilityErrors(definition.manifest);
    if (errors.length) {
      throw new Error(
        `Pipeline "${definition.name}" is unavailable: ${errors.join("; ")}`,
      );
    }
  }
  configureJobTerminalListener((binding) =>
    publishPipelineWakeup(binding.pipeline),
  );
  await syncPipelineDefinitions();
  instances.shutdownHandlers.push({
    name: "pipeline-globals",
    phase: "bindings",
    handler: () => {
      clearJobTerminalListener();
      clearPipelineRuntimeBindings();
    },
  });
}
