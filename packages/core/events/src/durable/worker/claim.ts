import { getDurabilityClient } from "@damatjs/durability";
import { claimEventDeliveryRow } from "./claim-transition";
import { selectEventDeliveryClaims } from "./claim-selection";
import { recoverExpiredEventDeliveryLease } from "./lease-recovery";
import type {
  ClaimEventDeliveriesOptions,
  ClaimedEventDelivery,
} from "./types";

export async function claimEventDeliveries(
  options: ClaimEventDeliveriesOptions,
): Promise<ClaimedEventDelivery[]> {
  validateClaimOptions(options);
  const client = options.client ?? getDurabilityClient();
  return client.transaction(async (executor) => {
    const rows = await selectEventDeliveryClaims(executor, options);
    const claims: ClaimedEventDelivery[] = [];
    for (const row of rows) {
      if (row.previous_status === "running") {
        const status = await recoverExpiredEventDeliveryLease(executor, row);
        if (status !== "pending") continue;
        row.previous_status = "pending";
      }
      claims.push(await claimEventDeliveryRow(executor, row, options));
    }
    return claims;
  });
}

function validateClaimOptions(options: ClaimEventDeliveriesOptions): void {
  if (!options.workerId.trim()) throw new Error("workerId cannot be empty");
  if (options.consumers.some(({ event, consumer }) => !event || !consumer)) {
    throw new Error("event and consumer identities cannot be empty");
  }
  for (const [name, value, max] of [
    ["limit", options.limit, 1_000],
    ["leaseMs", options.leaseMs, Number.MAX_SAFE_INTEGER],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 1 || value > max) {
      throw new Error(`${name} must be a positive safe integer`);
    }
  }
}
