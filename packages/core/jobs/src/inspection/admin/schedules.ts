import { validateWorkActor, type WorkActor } from "@damatjs/durability";
import {
  mapJobSchedule,
  type JobScheduleRow,
} from "../../repositories/map-schedule";
import type { JobSchedule } from "../../repositories";
import { appendScheduleActivity } from "../../schedules/activity";
import { publishJobWakeup } from "../../wakeup/publisher";
import type { ResolvedInspectionOptions } from "../config";
import { invalidTransition, notFound } from "./errors";

export async function setScheduleEnabled(
  id: string,
  enabled: boolean,
  actor: WorkActor,
  reason: string | undefined,
  options: ResolvedInspectionOptions,
): Promise<JobSchedule> {
  validateWorkActor(actor);
  const schedule = await options.client.transaction(async (executor) => {
    const current = await executor.query<JobScheduleRow>(
      `SELECT * FROM "_damat_job_schedules" WHERE "id"=$1 FOR UPDATE`,
      [id],
    );
    const row = current.rows[0];
    if (!row) throw notFound("job schedule", id);
    if (row.enabled === enabled) {
      throw invalidTransition(
        `job schedule is already ${enabled ? "enabled" : "disabled"}`,
      );
    }
    const updated = await executor.query<JobScheduleRow>(
      `UPDATE "_damat_job_schedules" SET "enabled"=$2,"updated_at"=NOW()
       WHERE "id"=$1 RETURNING *`,
      [id, enabled],
    );
    await appendScheduleActivity(
      executor,
      id,
      enabled ? "enabled" : "disabled",
      reason ? { reason } : {},
      actor,
    );
    return mapJobSchedule(updated.rows[0]!);
  });
  if (enabled) await publishJobWakeup(schedule.queue);
  return schedule;
}
