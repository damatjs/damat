import type { DurabilityExecutor } from "@damatjs/durability";
import {
  appendJobActivity,
  claimJobDeduplication,
  type JobSchedule,
} from "../repositories";
import { appendScheduleActivity } from "./activity";
import { insertScheduleOccurrence } from "./insert-occurrence";

export async function reconcileScheduleOccurrence(
  executor: DurabilityExecutor,
  schedule: JobSchedule,
): Promise<boolean> {
  const scheduledFor = schedule.nextOccurrenceAt!;
  let run = await insertScheduleOccurrence(executor, schedule, scheduledFor);
  if (run && schedule.deduplicationKey) {
    const ttl = schedule.deduplicationTtlMs;
    const claim = await claimJobDeduplication(executor, {
      queue: schedule.queue,
      name: schedule.jobName,
      key: schedule.deduplicationKey,
      runId: run.id,
      ...(ttl !== undefined ? { expiresAt: new Date(Date.now() + ttl) } : {}),
    });
    if (!claim.acquired) {
      await executor.query(`DELETE FROM "_damat_job_runs" WHERE "id"=$1`, [
        run.id,
      ]);
      run = undefined;
    }
  }
  if (run) {
    await appendJobActivity(executor, {
      runId: run.id,
      type: "scheduled",
      nextStatus: "queued",
    });
  }
  const next =
    schedule.kind === "interval"
      ? new Date(scheduledFor.getTime() + schedule.intervalMs!)
      : null;
  await executor.query(
    `UPDATE "_damat_job_schedules" SET "last_occurrence_at"=$2::timestamptz,
       "next_occurrence_at"=$3::timestamptz,
       "enabled"=CASE WHEN $3::timestamptz IS NULL THEN FALSE ELSE "enabled" END,
       "updated_at"=NOW() WHERE "id"=$1`,
    [schedule.id, scheduledFor, next],
  );
  if (run) {
    await appendScheduleActivity(executor, schedule.id, "occurrence_created", {
      runId: run.id,
    });
  }
  return Boolean(run);
}
