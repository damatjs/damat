import { getDurabilityClient } from "@damatjs/durability";
import { finishClaim } from "./finish";
import { calculateRetryDate } from "./retry-date";
import type { ClaimedJobRun } from "./types";

export async function completeJobFailure(
  claim: ClaimedJobRun,
  cause: unknown,
  options: { forceDeadLetter?: boolean } = {},
): Promise<"retry_wait" | "dead_lettered" | "cancelled"> {
  return getDurabilityClient().transaction(async (executor) => {
    const current = await executor.query<{ cancelled: boolean }>(
      `SELECT "cancellation_requested_at" IS NOT NULL AS "cancelled"
       FROM "_damat_job_runs" WHERE "id"=$1 AND "lease_owner"=$2
         AND "lease_token"=$3 FOR UPDATE`,
      [claim.id, claim.workerId, claim.leaseToken],
    );
    const cancelled = current.rows[0]?.cancelled === true;
    const exhausted = claim.attemptCount >= claim.maxAttempts;
    const retryAt = calculateRetryDate(claim);
    const status = cancelled
      ? "cancelled"
      : options.forceDeadLetter || exhausted || !retryAt
        ? "dead_lettered"
        : "retry_wait";
    const error = cancelled ? undefined : serializeError(cause);
    await finishClaim(executor, claim, {
      status,
      outcome: status,
      ...(error ? { error } : {}),
      ...(status === "retry_wait" && retryAt ? { availableAt: retryAt } : {}),
    });
    return status;
  });
}

function serializeError(cause: unknown): Record<string, unknown> {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      ...(cause.stack ? { stack: cause.stack } : {}),
    };
  }
  return { name: "Error", message: String(cause) };
}
