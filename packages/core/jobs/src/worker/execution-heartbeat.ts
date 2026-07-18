import type { DurabilityExecutor } from "@damatjs/durability";
import { heartbeatJobClaim } from "./heartbeat";
import type { ClaimedJobRun } from "./types";

export interface JobHeartbeatControl {
  cancellationRequested: boolean;
  run(executor?: DurabilityExecutor): Promise<void>;
}

export function createJobHeartbeatControl(
  claim: ClaimedJobRun,
  leaseMs: number,
  controller: AbortController,
): JobHeartbeatControl {
  const control: JobHeartbeatControl = {
    cancellationRequested: false,
    run: async (executor) => {
      const state = await heartbeatJobClaim(claim, {
        leaseMs,
        ...(executor ? { executor } : {}),
      });
      control.cancellationRequested ||= state.cancellationRequested;
      if (state.cancellationRequested) controller.abort();
    },
  };
  return control;
}
