import { getDurabilityClient } from "@damatjs/durability";
import { finishClaim } from "./finish";
import type { ClaimedJobRun } from "./types";

export async function completeJobCancellation(
  claim: ClaimedJobRun,
): Promise<void> {
  await getDurabilityClient().transaction((executor) =>
    finishClaim(executor, claim, {
      status: "cancelled",
      outcome: "cancelled",
    }),
  );
}
