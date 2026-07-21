import type { DurabilityExecutor } from "@damatjs/durability";
import { mapJobRun, type JobRunRow } from "../repositories/map-run";
import type { JobRun, JobSchedule } from "../repositories";

export async function insertScheduleOccurrence(
  executor: DurabilityExecutor,
  schedule: JobSchedule,
  scheduledFor: Date,
): Promise<JobRun | undefined> {
  const result = await executor.query<JobRunRow>(
    `INSERT INTO "_damat_job_runs" (
       "id","name","queue","payload","metadata","priority","available_at",
       "max_attempts","backoff_ms","backoff_multiplier","deduplication_key",
       "schedule_id","scheduled_for")
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT ("schedule_id","scheduled_for")
       WHERE "schedule_id" IS NOT NULL DO NOTHING
     RETURNING *`,
    [
      crypto.randomUUID(),
      schedule.jobName,
      schedule.queue,
      JSON.stringify(schedule.payload ?? null),
      JSON.stringify(schedule.metadata),
      schedule.priority,
      scheduledFor,
      schedule.maxAttempts,
      schedule.backoffMs,
      schedule.backoffMultiplier,
      schedule.deduplicationKey ?? null,
      schedule.id,
      scheduledFor,
    ],
  );
  return result.rows[0] ? mapJobRun(result.rows[0]) : undefined;
}
