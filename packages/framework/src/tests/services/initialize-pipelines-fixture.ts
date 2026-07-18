import { mock } from "bun:test";
import { workerState } from "./worker-runtime-fixture";

export const state = {
  definitions: [] as Array<{ name: string; manifest: object }>,
  errors: [] as string[],
  defaults: [] as unknown[],
  executorQueues: [] as string[],
  listeners: [] as unknown[],
  synced: 0,
  cleared: 0,
  routers: [] as unknown[],
  workers: workerState.jobs,
  started: workerState.started,
  stopped: workerState.stopped as unknown[],
};

class FakeRouter {
  constructor(options: unknown) {
    state.routers.push(options);
  }
  start() {
    state.started.push("router");
  }
  wake() {}
  async stop() {
    state.stopped.push("router");
  }
}

mock.module("@damatjs/jobs/pipeline-integration", () => ({
  configureJobTerminalListener: (listener: unknown) =>
    state.listeners.push(listener),
  clearJobTerminalListener: () => void state.cleared++,
}));
mock.module("@damatjs/pipelines", () => ({
  PipelineRouter: FakeRouter,
  configurePipelineDefaults: (value: unknown) => state.defaults.push(value),
  registerPipelineExecutorJob: (queue: string) =>
    state.executorQueues.push(queue),
  getAllPipelineDefinitions: () => state.definitions,
  validateOperationalLimits: () => {},
  pipelineCapabilityErrors: () => state.errors,
  publishPipelineWakeup: async () => {},
  syncPipelineDefinitions: async () => void state.synced++,
  clearPipelineRuntimeBindings: () => void state.cleared++,
  PIPELINE_WAKEUP_CHANNEL: "damat:pipelines:wakeup",
  parsePipelineWakeup: () => undefined,
  configurePipelineWakeupPublisher: () =>
    workerState.publishers.push("pipelines"),
  clearPipelineWakeupPublisher: () => {},
}));

export const { initializePipelineDefinitions, initializePipelines } =
  await import("../../services/initialize/pipelines");
export const { startWorkers } = await import("../../runtime/startWorkers");

export function reset(): void {
  for (const value of Object.values(state)) {
    if (Array.isArray(value)) value.length = 0;
  }
  state.synced = 0;
  state.cleared = 0;
}
