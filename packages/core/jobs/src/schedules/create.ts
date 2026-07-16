import type { JobScheduleRow } from "../repositories/map-schedule";
import { mapJobSchedule } from "../repositories/map-schedule";
import { DEFAULT_JOB_OPTIONS } from "../definitions/defaults";
import { getJobDefinition } from "../definitions/registry";
import { validateNonBlank } from "../validation/identifiers";
import { validateJobPolicies } from "../validation/policies";
import { appendScheduleActivity } from "./activity";
import { initialScheduleOccurrence } from "./occurrence";
import { scheduleTransaction } from "./transaction";
import type { CreateJobScheduleInput, JobSchedule } from "./types";
import { validateJobScheduleInput } from "./validate";
import { publishJobWakeup } from "../wakeup/publisher";

export async function createJobSchedule(
  input: CreateJobScheduleInput,
): Promise<JobSchedule> {
  validateCreate(input);
  const schedule = await scheduleTransaction(
    input.executor,
    async (executor) => {
      const defaults =
        getJobDefinition(input.jobName)?.options ?? DEFAULT_JOB_OPTIONS;
      const occurrence = initialScheduleOccurrence(input.schedule);
      const interval =
        input.schedule.kind === "interval" ? input.schedule.everyMs : null;
      const runAt = input.schedule.kind === "once" ? input.schedule.at : null;
      const result = await executor.query<JobScheduleRow>(
        `INSERT INTO "_damat_job_schedules" (
        "id","name","job_name","kind","enabled","payload","metadata",
        "queue","priority","max_attempts","backoff_ms","backoff_multiplier",
        "run_at","interval_ms","next_occurrence_at","deduplication_key",
        "deduplication_ttl_ms")
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
        [
          crypto.randomUUID(),
          input.name,
          input.jobName,
          input.schedule.kind,
          input.enabled ?? true,
          JSON.stringify(input.payload ?? null),
          JSON.stringify(input.metadata ?? {}),
          input.queue ?? defaults.queue,
          input.priority ?? defaults.priority,
          input.maxAttempts ?? defaults.maxAttempts,
          input.backoffMs ?? defaults.backoffMs,
          input.backoffMultiplier ?? defaults.backoffMultiplier,
          runAt,
          interval,
          occurrence,
          input.deduplication?.key ?? null,
          input.deduplication?.ttlMs ?? null,
        ],
      );
      const schedule = mapJobSchedule(result.rows[0]!);
      await appendScheduleActivity(executor, schedule.id, "created");
      return schedule;
    },
  );
  if (!input.executor && schedule.enabled) {
    await publishJobWakeup(schedule.queue);
  }
  return schedule;
}

function validateCreate(input: CreateJobScheduleInput): void {
  validateNonBlank(input.name, "schedule name");
  validateNonBlank(input.jobName, "job name");
  validateJobScheduleInput(input.schedule);
  validateJobPolicies(input);
  if (input.queue !== undefined) validateNonBlank(input.queue, "queue");
  const ttl = input.deduplication?.ttlMs;
  if (input.deduplication) {
    validateNonBlank(input.deduplication.key, "deduplication key");
  }
  if (ttl !== undefined && (!Number.isSafeInteger(ttl) || ttl < 0)) {
    throw new Error("deduplication ttlMs must be a nonnegative safe integer");
  }
}
