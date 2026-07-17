import type { DurabilityExecutor } from "@damatjs/durability";
import { appendJobActivity } from "../repositories";
import type { FinishInput } from "./finish";
import type { ClaimedJobRun } from "./types";

export async function appendFinishActivity(
  executor: DurabilityExecutor,
  claim: ClaimedJobRun,
  input: FinishInput,
  progress?: unknown,
): Promise<void> {
  const metadata = {
    ...(progress === undefined ? {} : { progress }),
    ...(input.availableAt
      ? { availableAt: input.availableAt.toISOString() }
      : {}),
  };
  await appendJobActivity(executor, {
    runId: claim.id,
    attemptNumber: claim.attemptCount,
    type: input.status,
    previousStatus: "running",
    nextStatus: input.status,
    workerId: claim.workerId,
    leaseToken: claim.leaseToken,
    ...(Object.keys(metadata).length ? { metadata } : {}),
  });
}
