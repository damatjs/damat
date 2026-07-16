import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import { recoverExpiredClaim } from "./claim-recovery";
import { selectClaimCandidates } from "./claim-selection";
import { claimCandidate } from "./claim-transition";
import type { ClaimJobRunsOptions, ClaimedJobRun } from "./types";

export async function claimJobRuns(
  options: ClaimJobRunsOptions,
): Promise<ClaimedJobRun[]> {
  const client = options.client ?? getDurabilityClient();
  return client.transaction((executor) => claimSelected(executor, options));
}

async function claimSelected(
  executor: DurabilityExecutor,
  options: ClaimJobRunsOptions,
): Promise<ClaimedJobRun[]> {
  const candidates = await selectClaimCandidates(executor, options);
  const claimed: ClaimedJobRun[] = [];
  for (const candidate of candidates) {
    if (
      candidate.previous_status === "running" &&
      (await recoverExpiredClaim(executor, candidate))
    ) {
      continue;
    }
    claimed.push(await claimCandidate(executor, candidate, options));
  }
  return claimed;
}
