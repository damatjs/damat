import type { DurabilityExecutor } from "@damatjs/durability";
import { mapJobRun, type JobRunRow } from "./map-run";
import type { JobRun, NewJobRun } from "./run-types";

export async function insertJobRun(
  executor: DurabilityExecutor,
  run: NewJobRun,
): Promise<JobRun> {
  const result = await executor.query<JobRunRow>(
    `INSERT INTO "_damat_job_runs" (
       "id","name","queue","payload","metadata","priority","available_at",
       "max_attempts","backoff_ms","backoff_multiplier",
       "deduplication_key","correlation_id","schedule_id","scheduled_for"
     ) VALUES (
       $1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14
     ) RETURNING *`,
    [
      run.id,
      run.name,
      run.queue,
      JSON.stringify(run.payload ?? null),
      JSON.stringify(run.metadata),
      run.priority,
      run.availableAt,
      run.maxAttempts,
      run.backoffMs,
      run.backoffMultiplier,
      run.deduplicationKey ?? null,
      run.correlationId ?? null,
      run.scheduleId ?? null,
      run.scheduledFor ?? null,
    ],
  );
  return mapJobRun(result.rows[0]!);
}
