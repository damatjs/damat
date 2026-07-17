import { mock } from "bun:test";

export const workerState = {
  jobs: [] as unknown[],
  events: [] as unknown[],
  routers: [] as unknown[],
  started: [] as string[],
  stopped: [] as string[],
  publishers: [] as string[],
};

mock.module("@damatjs/jobs", () => ({
  JobWorker: FakeJobWorker,
  configureJobWakeupPublisher: () => workerState.publishers.push("jobs"),
}));

export class FakeJobWorker {
  constructor(options: unknown) {
    workerState.jobs.push(options);
  }
  start() {
    workerState.started.push("jobs");
  }
  async stop() {
    workerState.stopped.push("jobs");
  }
}

export class FakeEventWorker {
  constructor(options: unknown) {
    workerState.events.push(options);
  }
  start() {
    workerState.started.push("events");
  }
  async stop() {
    workerState.stopped.push("events");
  }
}

export class FakeEventRouter {
  constructor(options: unknown) {
    workerState.routers.push(options);
  }
  start() {
    workerState.started.push("router");
  }
  async stop() {
    workerState.stopped.push("router");
  }
}

export function resetWorkers(): void {
  for (const values of Object.values(workerState)) values.length = 0;
}
