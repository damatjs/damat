import {
  listWorkers,
  redactValue,
  type DurabilityExecutor,
  type InspectionVisibility,
  type RedactionOptions,
} from "@damatjs/durability";

interface WorkerInspectionOptions {
  visibility: InspectionVisibility;
  redaction: RedactionOptions;
}

export async function readJobWorkerSummary(
  executor: DurabilityExecutor,
  now: Date,
  staleAfterMs: number,
  options: WorkerInspectionOptions,
) {
  const workers = (await listWorkers({ now, staleAfterMs, executor })).filter(
    ({ capabilities }) =>
      capabilities.some((value) => value.startsWith("jobs:")),
  );
  const observable = workers.filter(
    ({ state }) => state === "active" || state === "stale",
  );
  const active = observable.filter(({ state }) => state === "active");
  return {
    records: observable.map(({ application, deployment, ...worker }) => ({
      ...worker,
      ...(options.visibility !== "hidden"
        ? {
            application: redactValue(application, options.redaction) as Record<
              string,
              unknown
            >,
            deployment: redactValue(deployment, options.redaction) as Record<
              string,
              unknown
            >,
          }
        : {}),
    })),
    active: active.length,
    stale: observable.filter(({ state }) => state === "stale").length,
    concurrency: active.reduce((sum, worker) => sum + worker.concurrency, 0),
    inFlight: active.reduce((sum, worker) => sum + worker.inFlight, 0),
    oldestHeartbeatMs: observable.reduce(
      (oldest, worker) => Math.max(oldest, worker.heartbeatAgeMs),
      0,
    ),
  };
}
