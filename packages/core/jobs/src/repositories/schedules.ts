import { jobExecutor } from "./executor";
import { mapJobSchedule, type JobScheduleRow } from "./map-schedule";
import type { JobSchedule, ListJobSchedulesOptions } from "./schedule-types";

export async function findJobSchedules(
  options: ListJobSchedulesOptions = {},
): Promise<JobSchedule[]> {
  const result = await jobExecutor(options.executor).query<JobScheduleRow>(
    `SELECT * FROM "_damat_job_schedules"
     WHERE ($1::boolean IS NULL OR "enabled" = $1)
     ORDER BY "next_occurrence_at" ASC NULLS LAST, "name" ASC`,
    [options.enabled ?? null],
  );
  return result.rows.map(mapJobSchedule);
}
