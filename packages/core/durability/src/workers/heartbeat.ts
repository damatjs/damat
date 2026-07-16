import type { QueryResultRow } from "@damatjs/deps/pg";
import { workerExecutor } from "./repository";
import type { HeartbeatWorkerOptions, WorkerIdentityOptions } from "./types";

export async function heartbeatWorker(
  options: HeartbeatWorkerOptions,
): Promise<void> {
  const result = await workerExecutor(options.executor).query<QueryResultRow>(
    `UPDATE "_damat_workers" SET
       "last_heartbeat_at" = NOW(),
       "in_flight" = $2,
       "concurrency" = COALESCE($3, "concurrency")
     WHERE "id" = $1 AND "stopped_at" IS NULL`,
    [options.id, options.inFlight, options.concurrency ?? null],
  );
  if (result.rowCount !== 1)
    throw new Error(`Worker not active: ${options.id}`);
}

export async function stopWorker(
  options: WorkerIdentityOptions,
): Promise<void> {
  const result = await workerExecutor(options.executor).query<QueryResultRow>(
    `UPDATE "_damat_workers" SET
       "stopping_at" = COALESCE("stopping_at", NOW()),
       "stopped_at" = NOW(),
       "in_flight" = 0
     WHERE "id" = $1`,
    [options.id],
  );
  if (result.rowCount !== 1) throw new Error(`Worker not found: ${options.id}`);
}
