import type { ILogger } from "@damatjs/logger";
import { JobWorker } from "@damatjs/jobs";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";

export function initializeJobs(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
): void {
  const jobs = config.services?.jobs;
  if (!jobs?.worker) return;
  if (!config.projectConfig.redisUrl) {
    logger.warn(
      "services.jobs.worker is set but projectConfig.redisUrl is not — no jobs will run",
    );
    return;
  }
  const worker = new JobWorker({
    ...(jobs.queueName !== undefined && { queueName: jobs.queueName }),
    ...(jobs.concurrency !== undefined && { concurrency: jobs.concurrency }),
    ...(jobs.pollIntervalMs !== undefined && {
      pollIntervalMs: jobs.pollIntervalMs,
    }),
  });
  worker.start();
  instances.shutdownHandlers.push({
    name: "job-worker",
    handler: async () => worker.stop(),
  });
}
