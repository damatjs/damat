import type { DurabilityExecutor } from "@damatjs/durability";
import { heartbeatJobClaim } from "./heartbeat";
import type { ClaimedJobRun } from "./types";

export interface JobHeartbeatControl {
  cancellationRequested: boolean;
  run(executor?: DurabilityExecutor): Promise<void>;
  stop(): Promise<void>;
}

export function createJobHeartbeatControl(
  claim: ClaimedJobRun,
  leaseMs: number,
  controller: AbortController,
): JobHeartbeatControl {
  let stopped = false;
  let inFlight: Promise<void> | undefined;
  const control: JobHeartbeatControl = {
    cancellationRequested: false,
    run: async (executor) => {
      if (stopped || controller.signal.aborted) return;
      if (inFlight) return inFlight;
      const operation = heartbeatJobClaim(claim, {
        leaseMs,
        ...(executor ? { executor } : {}),
      }).then((state) => {
        control.cancellationRequested ||= state.cancellationRequested;
        if (state.cancellationRequested) controller.abort();
      });
      inFlight = operation;
      try {
        await operation;
      } finally {
        if (inFlight === operation) inFlight = undefined;
      }
    },
    stop: async () => {
      stopped = true;
      if (inFlight) await Promise.allSettled([inFlight]);
    },
  };
  return control;
}
