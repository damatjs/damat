import type { DurableEventHandler } from "../definitions/types";
import { createEventDeliveryContext } from "./context/create";
import { completeEventDeliverySuccess } from "./outcome";
import { normalizeEventDeliveryResult } from "./result";
import type {
  ClaimedEventDelivery,
  ExecuteEventDeliveryOptions,
} from "./types";

export async function runEventDeliveryHandler(
  claim: ClaimedEventDelivery,
  options: ExecuteEventDeliveryOptions,
  handler: DurableEventHandler,
  controller: AbortController,
  heartbeat: () => Promise<void>,
  settleHeartbeat: () => Promise<void> = async () => {},
): Promise<void> {
  const timer = options.batchHeartbeats
    ? undefined
    : setInterval(
        () =>
          void heartbeat().catch(() => {
            controller.abort();
            if (timer) clearInterval(timer);
          }),
        options.heartbeatIntervalMs,
      );
  const stopHeartbeat = () => {
    if (timer) clearInterval(timer);
  };
  controller.signal.addEventListener("abort", stopHeartbeat, { once: true });
  try {
    const context = createEventDeliveryContext(claim, controller, options);
    const result = normalizeEventDeliveryResult(
      await handler(claim.payload, context),
    );
    stopHeartbeat();
    await settleHeartbeat();
    if (!controller.signal.aborted) {
      await completeEventDeliverySuccess(claim, result);
    }
  } finally {
    stopHeartbeat();
    await settleHeartbeat();
    controller.signal.removeEventListener("abort", stopHeartbeat);
  }
}
