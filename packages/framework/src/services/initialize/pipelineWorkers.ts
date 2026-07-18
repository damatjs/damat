import { JobWorker } from "@damatjs/jobs";
import type { ILogger } from "@damatjs/logger";
import { PipelineRouter } from "@damatjs/pipelines";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { commonWorkerOptions } from "./workerOptions";

export function initializePipelines(
  config: AppConfig,
  instances: ServiceInstances,
  _logger: ILogger,
): { router: PipelineRouter; worker: JobWorker; queue: string } | undefined {
  const pipelines = config.services?.pipelines;
  if (!pipelines) return undefined;
  const queue = pipelines.queue ?? "damat-pipelines";
  const router = new PipelineRouter({
    batchSize: pipelines.routerBatchSize ?? 100,
    ...(config.services?.durability?.retentionIntervalMs !== undefined
      ? { retentionIntervalMs: config.services.durability.retentionIntervalMs }
      : {}),
    ...(instances.durabilityCoordinator
      ? { coordinator: instances.durabilityCoordinator }
      : {}),
  });
  const worker = new JobWorker({
    queue,
    concurrency: pipelines.concurrency ?? 1,
    ...commonWorkerOptions(
      config.services?.durability,
      instances.durabilityCoordinator,
    ),
    retentionMs: pipelines.retentionMs ?? 90 * 24 * 60 * 60 * 1_000,
    batchHeartbeats: true,
  });
  router.start();
  worker.start();
  instances.shutdownHandlers.push({
    name: "pipeline-router",
    phase: "claims",
    handler: () => router.stop(),
  });
  instances.shutdownHandlers.push({
    name: "pipeline-worker",
    phase: "claims",
    handler: () =>
      worker.stop(
        config.runtime?.shutdownGraceMs === undefined
          ? {}
          : { graceMs: config.runtime.shutdownGraceMs },
      ),
  });
  return { router, worker, queue };
}
