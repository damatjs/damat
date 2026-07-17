import type { ClaimedEventDelivery } from "./types";

const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

export function calculateEventRetryDate(
  claim: ClaimedEventDelivery,
): Date | undefined {
  const delay =
    claim.backoffMs * Math.pow(claim.backoffMultiplier, claim.attemptCount - 1);
  const timestamp = Date.now() + delay;
  if (!Number.isFinite(timestamp) || timestamp > MAX_DATE_TIMESTAMP)
    return undefined;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
