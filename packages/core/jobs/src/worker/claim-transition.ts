import { createLeaseToken, type DurabilityExecutor } from "@damatjs/durability";
import { appendJobActivity } from "../repositories";
import { mapClaimedJob, type ClaimCandidateRow } from "./claim-row";
import type { ClaimJobRunsOptions, ClaimedJobRun } from "./types";

export async function claimCandidate(
  executor: DurabilityExecutor,
  row: ClaimCandidateRow,
  options: ClaimJobRunsOptions,
): Promise<ClaimedJobRun> {
  const token = createLeaseToken();
  const updated = await executor.query(
    `UPDATE "_damat_job_runs" SET "status" = 'running',
       "attempt_count" = "attempt_count" + 1, "lease_owner" = $2,
       "lease_token" = $3, "lease_expires_at" = NOW()+($4*INTERVAL '1 ms'),
       "heartbeat_at" = NOW(), "started_at" = COALESCE("started_at",NOW()),
       "updated_at" = NOW() WHERE "id" = $1 RETURNING *`,
    [row.id, options.workerId, token, options.leaseMs],
  );
  const claim = mapClaimedJob(updated.rows[0] as never);
  await executor.query(
    `INSERT INTO "_damat_job_attempts"
       ("run_id","attempt_number","worker_id","lease_token","heartbeat_at")
     VALUES ($1,$2,$3,$4,NOW())`,
    [claim.id, claim.attemptCount, claim.workerId, claim.leaseToken],
  );
  await appendJobActivity(executor, {
    runId: claim.id,
    attemptNumber: claim.attemptCount,
    type: "claimed",
    previousStatus: row.previous_status,
    nextStatus: "running",
    workerId: claim.workerId,
    leaseToken: claim.leaseToken,
  });
  return claim;
}
