import type { DurabilityExecutor } from "@damatjs/durability";
import { reconcileScheduleOccurrence } from "../schedules/reconcile-occurrence";
import { scheduleTransaction } from "../schedules/transaction";
import type { ReconcileSchedulesOptions } from "../schedules/types";
import {
  mapJobSchedule,
  type JobScheduleRow,
} from "../repositories/map-schedule";
import { publishJobWakeup } from "../wakeup/publisher";
import { reconcileLimit } from "./reconcile-options";

interface ScheduleReconcileResult {
  count: number;
  queues: string[];
}

export async function reconcileJobSchedules(
  options: ReconcileSchedulesOptions = {},
): Promise<number> {
  const limit = reconcileLimit(options.limit);
  const owned = !options.executor;
  const operation = (executor: DurabilityExecutor) =>
    reconcile(executor, limit, options.queue);
  const result = await scheduleTransaction(options.executor, operation);
  if (owned) {
    for (const queue of new Set(result.queues)) await publishJobWakeup(queue);
  }
  return result.count;
}

async function reconcile(
  executor: DurabilityExecutor,
  limit: number,
  queue?: string,
): Promise<ScheduleReconcileResult> {
  const result = await executor.query<JobScheduleRow>(
    `SELECT * FROM "_damat_job_schedules"
     WHERE "enabled"=TRUE AND "next_occurrence_at" <= NOW()
       AND ($2::text IS NULL OR "queue"=$2)
     ORDER BY "next_occurrence_at","id" FOR UPDATE SKIP LOCKED LIMIT $1`,
    [limit, queue ?? null],
  );
  let created = 0;
  const queues: string[] = [];
  for (const row of result.rows) {
    const schedule = mapJobSchedule(row);
    if (await reconcileScheduleOccurrence(executor, schedule)) {
      created += 1;
      queues.push(schedule.queue);
    }
  }
  return { count: created, queues };
}
