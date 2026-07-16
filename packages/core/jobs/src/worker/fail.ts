import { getDurabilityClient } from "@damatjs/durability";
import { finishClaim } from "./finish";
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
    const status = cancelled
      ? "cancelled"
      : options.forceDeadLetter || exhausted
        ? "dead_lettered"
        : "retry_wait";
    const error = cancelled ? undefined : serializeError(cause);
    const delay =
      claim.backoffMs *
      Math.pow(claim.backoffMultiplier, claim.attemptCount - 1);
    await finishClaim(executor, claim, {
      status,
      outcome: status,
      ...(error ? { error } : {}),
      ...(status === "retry_wait"
        ? { availableAt: new Date(Date.now() + delay) }
        : {}),
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
