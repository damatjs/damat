import type { DurabilityExecutor } from "@damatjs/durability";
import type { ClaimCandidateRow } from "./claim-row";
import type { ClaimJobRunsOptions } from "./types";

export async function selectClaimCandidates(
  executor: DurabilityExecutor,
  options: ClaimJobRunsOptions,
): Promise<ClaimCandidateRow[]> {
  const result = await executor.query<ClaimCandidateRow>(
    `SELECT r.*, r."status" AS "previous_status"
     FROM "_damat_job_runs" r
     WHERE r."queue" = $1 AND (
       (r."status" IN ('queued','retry_wait') AND r."available_at" <= NOW())
       OR (r."status" = 'running' AND r."lease_expires_at" <= NOW()))
       AND NOT EXISTS (
         SELECT 1 FROM "_damat_work_controls" c
         WHERE c."work_kind" = 'job' AND c."scope" = r."queue"
           AND c."paused" = TRUE)
     ORDER BY r."available_at", r."priority", r."created_at", r."id"
     FOR UPDATE SKIP LOCKED LIMIT $2`,
    [options.queue, options.limit],
  );
  return result.rows;
}
