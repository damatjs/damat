import type { DurabilityExecutor } from "@damatjs/durability";
import { jobExecutor } from "./executor";
import { mapJobAttempt } from "./map-records";
import type { JobAttemptRow } from "./record-rows";
import type { JobAttempt } from "./record-types";

export async function findJobAttempts(
  runId: string,
  executor?: DurabilityExecutor,
): Promise<JobAttempt[]> {
  const result = await jobExecutor(executor).query<JobAttemptRow>(
    `SELECT * FROM "_damat_job_attempts"
     WHERE "run_id" = $1 ORDER BY "attempt_number" ASC`,
    [runId],
  );
  return result.rows.map(mapJobAttempt);
}
