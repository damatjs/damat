import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../config";
import { initializeDurableEvents } from "../services/initialize/events";
import { initializeJobs } from "../services/initialize/jobs";
import type { ServiceInstances } from "../services/types";
import type { ResolvedRuntime } from "./types";

function assertAvailable(config: AppConfig, runtime: ResolvedRuntime): void {
  for (const worker of runtime.workers) {
    const enabled =
      worker === "jobs"
        ? Boolean(config.services?.jobs)
        : Boolean(config.services?.events?.durable);
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
  if (runtime.workers.includes("jobs")) {
    initializeJobs(config, instances, logger);
  }
  if (runtime.workers.includes("events")) {
    initializeDurableEvents(config, instances, logger);
  }
}
