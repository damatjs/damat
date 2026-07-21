import type { DurabilityExecutor } from "@damatjs/durability";
import type { ClaimedJobRun } from "./types";
import { JobLeaseLostError } from "./errors";

export async function assertCurrentLease(
  executor: DurabilityExecutor,
  claim: ClaimedJobRun,
): Promise<void> {
  const result = await executor.query(
    `SELECT 1 FROM "_damat_job_runs"
     WHERE "id" = $1 AND "status" = 'running'
       AND "lease_owner" = $2 AND "lease_token" = $3
       AND "lease_expires_at" > NOW()
     FOR UPDATE`,
    [claim.id, claim.workerId, claim.leaseToken],
  );
  if (result.rowCount !== 1) throw new JobLeaseLostError(claim.id);
}
