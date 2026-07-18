import {
  recordAccelerationSignal,
  type DurabilityExecutor,
  type WorkActor,
} from "@damatjs/durability";
import { jobExecutor } from "./executor";
import { mapJobActivity } from "./map-records";
import type { JobActivityRow } from "./record-rows";
import type { JobActivity } from "./record-types";
import type { JobRunStatus } from "./run-types";

export interface AppendActivityInput {
  runId: string;
  attemptNumber?: number;
  type: string;
  previousStatus?: JobRunStatus;
  nextStatus?: JobRunStatus;
  workerId?: string;
  leaseToken?: string;
  reason?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  actor?: WorkActor | Record<string, unknown>;
}

export async function appendJobActivity(
  executor: DurabilityExecutor,
  input: AppendActivityInput,
): Promise<JobActivity> {
  const result = await executor.query<JobActivityRow>(
    `INSERT INTO "_damat_job_activity"
       ("run_id","attempt_number","type","previous_status","next_status",
        "worker_id","lease_token","reason","duration_ms","metadata","actor")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)
     RETURNING *`,
    [
      input.runId,
      input.attemptNumber ?? null,
      input.type,
      input.previousStatus ?? null,
      input.nextStatus ?? null,
      input.workerId ?? null,
      input.leaseToken ?? null,
      input.reason ?? null,
      input.durationMs ?? null,
      JSON.stringify(input.metadata ?? {}),
      JSON.stringify(input.actor ?? {}),
    ],
  );
  await recordAccelerationSignal({
    topic: "damat:inspection:invalidate",
    kind: "job",
    resourceId: input.runId,
    executor,
  });
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
