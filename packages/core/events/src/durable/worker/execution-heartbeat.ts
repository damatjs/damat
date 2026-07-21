import type { DurabilityExecutor } from "@damatjs/durability";
import { heartbeatEventDelivery } from "./heartbeat";
import type { ClaimedEventDelivery } from "./types";

export interface EventHeartbeatControl {
  cancellationRequested: boolean;
  run(executor?: DurabilityExecutor): Promise<void>;
  stop(): Promise<void>;
}

export function createEventHeartbeatControl(
  claim: ClaimedEventDelivery,
  leaseMs: number,
  controller: AbortController,
): EventHeartbeatControl {
  let stopped = false;
  let inFlight: Promise<void> | undefined;
  const control: EventHeartbeatControl = {
    cancellationRequested: false,
    run: async (executor) => {
      if (stopped || controller.signal.aborted) return;
      if (inFlight) return inFlight;
      const operation = heartbeatEventDelivery(claim, {
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
