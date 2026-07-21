import type { DurabilityExecutor } from "@damatjs/durability";
import { findJobActivity, findJobAttempts, findJobLogs } from "../repositories";
import type { ResolvedInspectionOptions } from "./config";
import { readOperationalHistory } from "./detail/history";
import {
  visibleOperationalHistory,
  visibleScheduleHistory,
} from "./detail/redaction";
import type { DetailRunRow } from "./detail/rows";
import { readScheduleHistory } from "./detail/schedule";
import { visibleDetailRecords } from "./detail/visibility";
import { mapRunSummary } from "./list/rows";
import type { JobRunDetail } from "./types";

export function getInspectedJobRun(
  id: string,
  options: ResolvedInspectionOptions,
): Promise<JobRunDetail | null> {
  return options.client.transaction(async (executor) => {
    await executor.query(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const row = await readDetailRow(executor, id);
    if (!row) return null;
    const attempts = await findJobAttempts(id, executor);
    const activity = await findJobActivity(id, executor);
    const logs = await findJobLogs(id, executor);
    const records = visibleDetailRecords(
      row,
      attempts,
      activity,
      logs,
      options,
    );
    const history = visibleOperationalHistory(
      await readOperationalHistory(
        executor,
        row,
        attempts,
        options.staleAfterMs,
      ),
      options,
    );
    const schedule = visibleScheduleHistory(
      await readScheduleHistory(executor, row.schedule_id ?? undefined),
      options,
    );
    return {
      ...mapRunSummary(row, options),
      ...records,
      ...history,
      ...schedule,
      logsTruncated: activity.some(({ type }) => type === "logs_truncated"),
    };
  });
}

async function readDetailRow(
  executor: DurabilityExecutor,
  id: string,
): Promise<DetailRunRow | undefined> {
  const result = await executor.query<DetailRunRow>(
    `SELECT r.*,
       (date_trunc('milliseconds',r."created_at" AT TIME ZONE 'UTC')
         AT TIME ZONE 'UTC') AS "cursor_at", NOW() AS "inspected_at",
       EXISTS (SELECT 1 FROM "_damat_job_activity" a
         WHERE a."run_id"=r."id" AND a."type"='lease_recovered') AS "recovered"
     FROM "_damat_job_runs" r WHERE r."id"=$1`,
    [id],
  );
  return result.rows[0];
}
