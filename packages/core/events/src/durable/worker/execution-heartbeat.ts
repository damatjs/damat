import type { DurabilityExecutor } from "@damatjs/durability";
import { heartbeatEventDelivery } from "./heartbeat";
import type { ClaimedEventDelivery } from "./types";

export interface EventHeartbeatControl {
  cancellationRequested: boolean;
  run(executor?: DurabilityExecutor): Promise<void>;
}

export function createEventHeartbeatControl(
  claim: ClaimedEventDelivery,
  leaseMs: number,
  controller: AbortController,
): EventHeartbeatControl {
  const control: EventHeartbeatControl = {
    cancellationRequested: false,
    run: async (executor) => {
      const state = await heartbeatEventDelivery(claim, {
        leaseMs,
        ...(executor ? { executor } : {}),
      });
      control.cancellationRequested ||= state.cancellationRequested;
      if (state.cancellationRequested) controller.abort();
    },
  };
  return control;
}
