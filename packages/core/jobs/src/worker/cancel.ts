import { getDurabilityClient } from "@damatjs/durability";
import { finishClaim } from "./finish";
import type { ClaimedJobRun } from "./types";
import { notifyJobTerminal } from "../terminal/listener";

export async function completeJobCancellation(
  claim: ClaimedJobRun,
): Promise<void> {
  await getDurabilityClient().transaction((executor) =>
    finishClaim(executor, claim, {
      status: "cancelled",
      outcome: "cancelled",
    }),
  );
  await notifyJobTerminal(claim, "cancelled");
}
