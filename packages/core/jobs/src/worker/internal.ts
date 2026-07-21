import type { WorkerDependencies } from "./dependencies";
import { JobWorkerRuntime } from "./runtime";
import type { JobWorkerOptions } from "./types";

export function createInternalJobWorker(
  options: JobWorkerOptions,
  dependencies: WorkerDependencies,
): JobWorkerRuntime {
  return new JobWorkerRuntime(options, dependencies);
}
