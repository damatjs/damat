import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import { JobLeaseLostError } from "./errors";
import type { ClaimedJobRun } from "./types";

export async function heartbeatJobClaim(
  claim: ClaimedJobRun,
  options: {
    leaseMs: number;
    client?: ReturnType<typeof getDurabilityClient>;
    executor?: DurabilityExecutor;
  },
): Promise<{ cancellationRequested: boolean }> {
  const executor = options.executor ?? options.client ?? getDurabilityClient();
  const result = await executor.query<{ cancellation_requested: boolean }>(
    `WITH run AS (
       UPDATE "_damat_job_runs" SET
         "heartbeat_at" = NOW(),
         "lease_expires_at" = NOW()+($4*INTERVAL '1 ms'),
         "updated_at" = NOW()
       WHERE "id" = $1 AND "status" = 'running'
         AND "lease_owner" = $2 AND "lease_token" = $3
         AND "lease_expires_at" > NOW()
       RETURNING "cancellation_requested_at" IS NOT NULL
         AS "cancellation_requested")
     UPDATE "_damat_job_attempts" a SET "heartbeat_at" = NOW()
     FROM run WHERE a."run_id" = $1 AND a."attempt_number" = $5
     RETURNING run."cancellation_requested"`,
    [
      claim.id,
      claim.workerId,
      claim.leaseToken,
      options.leaseMs,
      claim.attemptCount,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new JobLeaseLostError(claim.id);
  return { cancellationRequested: row.cancellation_requested };
}
