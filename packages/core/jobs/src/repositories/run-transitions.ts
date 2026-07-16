import type { DurabilityExecutor } from "@damatjs/durability";
import { mapJobRun, type JobRunRow } from "./map-run";
import type { JobRun, JobRunStatus } from "./run-types";

export async function transitionJobRun(
  executor: DurabilityExecutor,
  id: string,
  from: JobRunStatus[],
  to: JobRunStatus,
): Promise<JobRun | undefined> {
  const result = await executor.query<JobRunRow>(
    `UPDATE "_damat_job_runs"
     SET "status" = $3, "updated_at" = NOW(),
       "completed_at" = CASE WHEN $3 IN ('cancelled','succeeded')
         THEN NOW() ELSE NULL END,
       "available_at" = CASE WHEN $3 = 'queued' THEN NOW() ELSE "available_at" END
     WHERE "id" = $1 AND "status" = ANY($2::text[])
     RETURNING *`,
    [id, from, to],
  );
  return result.rows[0] ? mapJobRun(result.rows[0]) : undefined;
}

export async function requestJobCancellation(
  executor: DurabilityExecutor,
  id: string,
): Promise<JobRun | undefined> {
  const result = await executor.query<JobRunRow>(
    `UPDATE "_damat_job_runs"
     SET "cancellation_requested_at" = NOW(), "updated_at" = NOW()
     WHERE "id" = $1 AND "status" = 'running'
       AND "cancellation_requested_at" IS NULL
     RETURNING *`,
    [id],
  );
  return result.rows[0] ? mapJobRun(result.rows[0]) : undefined;
}
