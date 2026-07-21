import { withIdempotency } from "@damatjs/durability";
import type { DurableEventHandlerContext } from "../../definitions/types";
import type {
  ClaimedEventDelivery,
  EventDeliveryContextOptions,
} from "../types";
import { recordEventDeliveryLog } from "./log";
import { recordEventDeliveryProgress } from "./progress";

const DEFAULT_LIMITS = { maxCount: 1_000, maxBytes: 1_048_576 };

export function createEventDeliveryContext(
  claim: ClaimedEventDelivery,
  controller: AbortController,
  options: EventDeliveryContextOptions = {},
): DurableEventHandlerContext {
  return {
    eventId: claim.eventId,
    deliveryId: claim.id,
    consumer: claim.consumer,
    attemptNumber: claim.attemptCount,
    maxAttempts: claim.maxAttempts,
    metadata: claim.metadata,
    signal: controller.signal,
    withIdempotency,
    progress: (value, metadata) =>
      recordEventDeliveryProgress(
        claim,
        value,
        metadata,
        options.progressMinimumIntervalMs ?? 1_000,
      ),
    log: (level, message, context = {}) =>
      recordEventDeliveryLog(
        claim,
        level,
        message,
        context,
        options.logLimits ?? DEFAULT_LIMITS,
        options.redaction ?? {},
      ),
  };
}
