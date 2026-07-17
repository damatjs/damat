import type { ILogger } from "@damatjs/logger";
import { JobWorker } from "@damatjs/jobs";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { jobWorkerOptions } from "./workerOptions";
import { getWorkerWakeupRedis } from "./wakeup";

export function initializeJobs(
  config: AppConfig,
  instances: ServiceInstances,
  _logger: ILogger,
): void {
  const jobs = config.services?.jobs;
  if (!jobs) return;
  const wakeupRedis = getWorkerWakeupRedis(config);
  const worker = new JobWorker({
    ...(jobs.queue !== undefined && { queue: jobs.queue }),
    ...(jobs.concurrency !== undefined && { concurrency: jobs.concurrency }),
    ...jobWorkerOptions(config.services?.durability),
    ...(wakeupRedis && { wakeupRedis }),
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
}
