import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../config";
import { initializeDurableEvents } from "../services/initialize/events";
import { initializeJobs } from "../services/initialize/jobs";
import { initializePipelines } from "../services/initialize/pipelines";
import type { ServiceInstances } from "../services/types";
import type { ResolvedRuntime } from "./types";
import type { WakeupTargets } from "../services/initialize/wakeupTargets";
import { startWorkerWakeups } from "./startWorkerWakeups";

function assertAvailable(config: AppConfig, runtime: ResolvedRuntime): void {
  for (const worker of runtime.workers) {
    const enabled =
      worker === "jobs"
        ? Boolean(config.services?.jobs)
        : worker === "events"
          ? Boolean(config.services?.events?.durable)
          : Boolean(config.services?.pipelines);
    if (!enabled)
      throw new Error(`${worker} worker is not enabled in services`);
  }
}

export function startWorkers(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
  runtime: ResolvedRuntime,
): void {
  assertAvailable(config, runtime);
  const targets: WakeupTargets = {};
  if (runtime.workers.includes("jobs")) {
    const worker = initializeJobs(config, instances, logger);
    if (worker) targets.job = worker;
  }
  if (runtime.workers.includes("events")) {
    const events = initializeDurableEvents(
      config,
      instances,
      logger,
      !runtime.workers.includes("jobs"),
    );
    if (events) {
      targets.router = events.router;
      if (events.worker) targets.event = events.worker;
    }
  }
  if (runtime.workers.includes("pipelines")) {
    const pipelines = initializePipelines(config, instances, logger);
    if (pipelines) targets.pipeline = pipelines;
  }
  startWorkerWakeups(config, instances, logger, targets);
}
