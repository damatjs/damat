import type { DurabilityExecutor } from "@damatjs/durability";
import { jobExecutor } from "./executor";
import { mapJobActivity } from "./map-records";
import type { JobActivityRow } from "./record-rows";
import type { JobActivity } from "./record-types";
import type { JobRunStatus } from "./run-types";

export interface AppendActivityInput {
  runId: string;
  type: string;
  previousStatus?: JobRunStatus;
  nextStatus?: JobRunStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
  actor?: Record<string, unknown>;
}

export async function appendJobActivity(
  executor: DurabilityExecutor,
  input: AppendActivityInput,
): Promise<JobActivity> {
  const result = await executor.query<JobActivityRow>(
    `INSERT INTO "_damat_job_activity"
       ("run_id","type","previous_status","next_status","reason","metadata","actor")
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
     RETURNING *`,
    [
      input.runId,
      input.type,
      input.previousStatus ?? null,
      input.nextStatus ?? null,
      input.reason ?? null,
      JSON.stringify(input.metadata ?? {}),
      JSON.stringify(input.actor ?? {}),
    ],
  );
  return mapJobActivity(result.rows[0]!);
}

export async function findJobActivity(
  runId: string,
  executor?: DurabilityExecutor,
): Promise<JobActivity[]> {
  const result = await jobExecutor(executor).query<JobActivityRow>(
    `SELECT * FROM "_damat_job_activity"
     WHERE "run_id" = $1 ORDER BY "id" ASC`,
    [runId],
  );
  return result.rows.map(mapJobActivity);
}
