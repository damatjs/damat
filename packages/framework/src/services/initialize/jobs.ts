import type { ILogger } from "@damatjs/logger";
import { JobWorker } from "@damatjs/jobs";
import {
  createDurabilityClient,
  setDurabilityClient,
  type DurabilityPool,
} from "@damatjs/durability";
import { PoolManager } from "@damatjs/services";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";

export function initializeJobs(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
): void {
  const jobs = config.services?.jobs;
  if (!jobs) return;
  if (!config.projectConfig.databaseUrl) {
    logger.warn(
      "services.jobs requires projectConfig.databaseUrl — durable jobs are disabled",
    );
    return;
  }
  const client = createDurabilityClient({
    pool: PoolManager.getPool() as DurabilityPool,
  });
  setDurabilityClient(client);
  if (!jobs.worker) return;
  const worker = new JobWorker({
    ...(jobs.queue !== undefined && { queue: jobs.queue }),
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
