import { getDurabilityClient } from "@damatjs/durability";
import { finishEventDelivery } from "./finish";
import { calculateEventRetryDate } from "./retry-date";
import { EventDeliveryLeaseLostError } from "./errors";
import type { ClaimedEventDelivery, EventDeliveryResult } from "./types";

export async function completeEventDeliverySuccess(
  claim: ClaimedEventDelivery,
  result: EventDeliveryResult,
): Promise<"succeeded" | "cancelled"> {
  return getDurabilityClient().transaction(async (executor) => {
    const cancelled = await executor.query(
      `SELECT 1 FROM "_damat_event_deliveries" WHERE "id"=$1
       AND "event_id"=$4 AND "consumer"=$5
       AND "status"='running' AND "lease_owner"=$2 AND "lease_token"=$3
       AND "lease_expires_at">NOW() AND "cancellation_requested_at" IS NOT NULL
       FOR UPDATE`,
      [
        claim.id,
        claim.workerId,
        claim.leaseToken,
        claim.eventId,
        claim.consumer,
      ],
    );
    const status = cancelled.rowCount ? "cancelled" : "succeeded";
    await finishEventDelivery(executor, claim, {
      status,
      ...(status === "succeeded" && result !== undefined ? { result } : {}),
    });
    return status;
  });
}

export async function completeEventDeliveryFailure(
  claim: ClaimedEventDelivery,
  cause: unknown,
  options: { forceDeadLetter?: boolean } = {},
): Promise<"retry_wait" | "dead_lettered" | "cancelled"> {
  return getDurabilityClient().transaction(async (executor) => {
    const state = await executor.query<{ cancelled: boolean }>(
      `SELECT "cancellation_requested_at" IS NOT NULL AS "cancelled"
       FROM "_damat_event_deliveries" WHERE "id"=$1
       AND "event_id"=$4 AND "consumer"=$5 AND "status"='running'
       AND "lease_owner"=$2 AND "lease_token"=$3
       AND "lease_expires_at">NOW() FOR UPDATE`,
      [
        claim.id,
        claim.workerId,
        claim.leaseToken,
        claim.eventId,
        claim.consumer,
      ],
    );
    if (!state.rows[0]) return finishLost(claim);
    const retryAt = calculateEventRetryDate(claim);
    const exhausted = claim.attemptCount >= claim.maxAttempts;
    const status = state.rows[0].cancelled
      ? "cancelled"
      : options.forceDeadLetter || exhausted || !retryAt
        ? "dead_lettered"
        : "retry_wait";
    const error = status === "cancelled" ? undefined : serializeError(cause);
    await finishEventDelivery(executor, claim, {
      status,
      ...(error ? { error } : {}),
      ...(error?.message ? { reason: String(error.message) } : {}),
      ...(status === "retry_wait" && retryAt ? { availableAt: retryAt } : {}),
    });
    return status;
  });
}

function finishLost(claim: ClaimedEventDelivery): never {
  throw new EventDeliveryLeaseLostError(claim.id);
}

function serializeError(cause: unknown): Record<string, unknown> {
  return cause instanceof Error
    ? {
        name: cause.name,
        message: cause.message,
        ...(cause.stack ? { stack: cause.stack } : {}),
      }
    : { name: "Error", message: String(cause) };
}
