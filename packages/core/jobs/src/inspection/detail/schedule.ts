import type { DurabilityExecutor } from "@damatjs/durability";
import { mapJobSchedule } from "../../repositories/map-schedule";
import type { JobScheduleRow } from "../../repositories/map-schedule";
import type { JobSchedule } from "../../repositories";
import type { JobScheduleActivity } from "../types";
import type { ScheduleActivityRow } from "./rows";

export async function readScheduleHistory(
  executor: DurabilityExecutor,
  scheduleId?: string,
): Promise<{
  schedule?: JobSchedule;
  scheduleActivity: JobScheduleActivity[];
}> {
  if (!scheduleId) return { scheduleActivity: [] };
  const schedule = await executor.query<JobScheduleRow>(
    `SELECT * FROM "_damat_job_schedules" WHERE "id"=$1`,
    [scheduleId],
  );
  const activity = await executor.query<ScheduleActivityRow>(
    `SELECT * FROM "_damat_job_schedule_activity"
     WHERE "schedule_id"=$1 ORDER BY "occurred_at","id"`,
    [scheduleId],
  );
  const row = schedule.rows[0];
  return {
    ...(row ? { schedule: mapJobSchedule(row) } : {}),
    scheduleActivity: activity.rows.map((item) => ({
      id: String(item.id),
      type: item.type,
      occurredAt: item.occurred_at,
      metadata: item.metadata,
      actor: item.actor,
    })),
  };
}
