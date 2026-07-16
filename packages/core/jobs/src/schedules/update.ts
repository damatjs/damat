import type { JobScheduleRow } from "../repositories/map-schedule";
import { mapJobSchedule } from "../repositories/map-schedule";
import { appendScheduleActivity } from "./activity";
import { initialScheduleOccurrence } from "./occurrence";
import { scheduleTransaction } from "./transaction";
import type { JobSchedule, UpdateJobScheduleInput } from "./types";
import { validateJobScheduleInput } from "./validate";
import { publishJobWakeup } from "../wakeup/publisher";

export async function updateJobSchedule(
  id: string,
  input: UpdateJobScheduleInput,
): Promise<JobSchedule | undefined> {
  if (input.schedule) validateJobScheduleInput(input.schedule);
  const schedule = await scheduleTransaction(
    input.executor,
    async (executor) => {
      const next = input.schedule
        ? initialScheduleOccurrence(input.schedule)
        : null;
      const result = await executor.query<JobScheduleRow>(
        `UPDATE "_damat_job_schedules" SET
        "enabled"=COALESCE($2::boolean,"enabled"),
        "payload"=COALESCE($3::jsonb,"payload"),
        "metadata"=COALESCE($4::jsonb,"metadata"),
        "kind"=COALESCE($5::text,"kind"),
        "run_at"=CASE WHEN $5::text IS NULL THEN "run_at" ELSE $6::timestamptz END,
        "interval_ms"=CASE WHEN $5::text IS NULL THEN "interval_ms" ELSE $7::bigint END,
        "next_occurrence_at"=COALESCE($8::timestamptz,"next_occurrence_at"),
        "updated_at"=NOW()
       WHERE "id"=$1 RETURNING *`,
        [
          id,
          input.enabled ?? null,
          input.payload === undefined
            ? null
            : JSON.stringify(input.payload ?? null),
          input.metadata === undefined ? null : JSON.stringify(input.metadata),
          input.schedule?.kind ?? null,
          input.schedule?.kind === "once" ? input.schedule.at : null,
          input.schedule?.kind === "interval" ? input.schedule.everyMs : null,
          next,
        ],
      );
      const row = result.rows[0];
      if (!row) return undefined;
      const schedule = mapJobSchedule(row);
      await appendScheduleActivity(executor, id, "updated", {
        enabled: schedule.enabled,
      });
      return schedule;
    },
  );
  if (!input.executor && schedule?.enabled) {
    await publishJobWakeup(schedule.queue);
  }
  return schedule;
}
