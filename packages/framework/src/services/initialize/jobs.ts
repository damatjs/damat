import type { ILogger } from "@damatjs/logger";
import { JobWorker } from "@damatjs/jobs";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { jobWorkerOptions } from "./workerOptions";

export function initializeJobs(
  config: AppConfig,
  instances: ServiceInstances,
  _logger: ILogger,
): JobWorker | undefined {
  const jobs = config.services?.jobs;
  if (!jobs) return undefined;
  const worker = new JobWorker({
    ...(jobs.queue !== undefined && { queue: jobs.queue }),
    ...(jobs.concurrency !== undefined && { concurrency: jobs.concurrency }),
    ...jobWorkerOptions(
      config.services?.durability,
      instances.durabilityCoordinator,
    ),
    batchHeartbeats: true,
  });
  worker.start();
  instances.shutdownHandlers.push({
    name: "job-worker",
    phase: "claims",
    handler: async () =>
      worker.stop(
        config.runtime?.shutdownGraceMs === undefined
          ? {}
          : { graceMs: config.runtime.shutdownGraceMs },
      ),
  });
  return worker;
}
