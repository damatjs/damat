import { getDurabilityClient } from "@damatjs/durability";
import type { JobResult } from "./types";
import type { ClaimedJobRun } from "./types";
import { finishClaim } from "./finish";

export async function completeJobSuccess(
  claim: ClaimedJobRun,
  result: JobResult,
): Promise<"succeeded" | "cancelled"> {
  return getDurabilityClient().transaction(async (executor) => {
    const cancellation = await executor.query(
      `SELECT 1 FROM "_damat_job_runs"
       WHERE "id"=$1 AND "lease_owner"=$2 AND "lease_token"=$3
         AND "cancellation_requested_at" IS NOT NULL FOR UPDATE`,
      [claim.id, claim.workerId, claim.leaseToken],
    );
    const status = cancellation.rowCount ? "cancelled" : "succeeded";
    await finishClaim(executor, claim, {
      status,
      outcome: status,
      ...(status === "succeeded" && result !== undefined ? { result } : {}),
    });
    return status;
  });
}
