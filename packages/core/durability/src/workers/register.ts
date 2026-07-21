import type { QueryResultRow } from "@damatjs/deps/pg";
import { workerExecutor } from "./repository";
import type { RegisterWorkerOptions } from "./types";

export async function registerWorker(
  options: RegisterWorkerOptions,
): Promise<void> {
  const result = await workerExecutor(options.executor).query<QueryResultRow>(
    `INSERT INTO "_damat_workers"
      ("id", "capabilities", "hostname", "process_id", "application",
       "deployment", "concurrency", "in_flight")
     VALUES ($1, $2::jsonb, $3, $4, $5::jsonb, $6::jsonb, $7, 0)
     ON CONFLICT ("id") DO UPDATE SET
       "capabilities" = EXCLUDED."capabilities",
       "hostname" = EXCLUDED."hostname",
       "process_id" = EXCLUDED."process_id",
       "application" = EXCLUDED."application",
       "deployment" = EXCLUDED."deployment",
       "started_at" = NOW(),
       "last_heartbeat_at" = NOW(),
       "stopping_at" = NULL,
       "stopped_at" = NULL,
       "concurrency" = EXCLUDED."concurrency",
       "in_flight" = 0`,
    [
      options.id,
      JSON.stringify(options.capabilities),
      options.hostname,
      options.processId,
      JSON.stringify(options.application ?? {}),
      JSON.stringify(options.deployment ?? {}),
      options.concurrency,
    ],
  );
  if (result.rowCount !== 1) throw new Error("Worker registration failed");
}
