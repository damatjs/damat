import type { DurabilityExecutor } from "@damatjs/durability";
import { jobExecutor } from "./executor";
import { mapJobLog } from "./map-records";
import type { JobLogRow } from "./record-rows";
import type { JobLog } from "./record-types";

export async function findJobLogs(
  runId: string,
  executor?: DurabilityExecutor,
): Promise<JobLog[]> {
  const result = await jobExecutor(executor).query<JobLogRow>(
    `SELECT * FROM "_damat_job_logs"
     WHERE "run_id" = $1
     ORDER BY "attempt_number" ASC, "sequence" ASC`,
    [runId],
  );
  return result.rows.map(mapJobLog);
}
