import type { DurabilityExecutor } from "@damatjs/durability";
import { jobExecutor } from "./executor";
import { mapJobRun, type JobRunRow } from "./map-run";
import type { JobRun, ListJobRunsOptions } from "./run-types";

export async function findJobRun(
  id: string,
  executor?: DurabilityExecutor,
): Promise<JobRun | undefined> {
  const result = await jobExecutor(executor).query<JobRunRow>(
    `SELECT * FROM "_damat_job_runs" WHERE "id" = $1`,
    [id],
  );
  return result.rows[0] ? mapJobRun(result.rows[0]) : undefined;
}

export async function lockJobRun(
  executor: DurabilityExecutor,
  id: string,
): Promise<JobRun | undefined> {
  const result = await executor.query<JobRunRow>(
    `SELECT * FROM "_damat_job_runs" WHERE "id" = $1 FOR UPDATE`,
    [id],
  );
  return result.rows[0] ? mapJobRun(result.rows[0]) : undefined;
}

export async function findJobRuns(
  options: ListJobRunsOptions = {},
): Promise<JobRun[]> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const result = await jobExecutor(options.executor).query<JobRunRow>(
    `SELECT * FROM "_damat_job_runs"
     WHERE ($1::text IS NULL OR "name" = $1)
       AND ($2::text IS NULL OR "queue" = $2)
       AND ($3::text IS NULL OR "status" = $3)
     ORDER BY "priority" ASC, "available_at" ASC, "created_at" ASC, "id" ASC
     LIMIT $4`,
    [
      options.name ?? null,
      options.queue ?? null,
      options.status ?? null,
      limit,
    ],
  );
  return result.rows.map(mapJobRun);
}
