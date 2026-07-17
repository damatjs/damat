import { getLogger } from "@damatjs/logger";
import { getDurableEventConsumer } from "../definitions/registry";
import { runEventDeliveryHandler } from "./execution-handler";
import { heartbeatEventDelivery } from "./heartbeat";
import { completeEventDeliveryFailure } from "./outcome";
import type {
  ClaimedEventDelivery,
  ExecuteEventDeliveryOptions,
} from "./types";
import { resolveExecutionOptions } from "./execution-options";

export interface EventDeliveryExecution {
  promise: Promise<void>;
  abort(): void;
}

export function startEventDeliveryExecution(
  claim: ClaimedEventDelivery,
  input: ExecuteEventDeliveryOptions = {},
): EventDeliveryExecution {
  const controller = new AbortController();
  const options = resolveExecutionOptions(input);
  return {
    promise: runClaim(claim, options, controller),
    abort: () => controller.abort(),
  };
}

async function runClaim(
  claim: ClaimedEventDelivery,
  options: Required<
    Pick<ExecuteEventDeliveryOptions, "leaseMs" | "heartbeatIntervalMs">
  > &
    ExecuteEventDeliveryOptions,
  controller: AbortController,
): Promise<void> {
  const definition = getDurableEventConsumer(claim.event, claim.consumer);
  if (!definition) {
    await completeEventDeliveryFailure(
      claim,
      new Error(
        `Unknown durable event consumer "${claim.event}"/"${claim.consumer}"`,
      ),
      { forceDeadLetter: true },
    );
    return;
  }
  let cancellationRequested = false;
  const heartbeat = async () => {
    const state = await heartbeatEventDelivery(claim, {
      leaseMs: options.leaseMs,
    });
    cancellationRequested ||= state.cancellationRequested;
    if (state.cancellationRequested) controller.abort();
  };
  try {
    await heartbeat();
    if (cancellationRequested) throw new Error("Delivery cancelled");
    if (controller.signal.aborted) return;
    await runEventDeliveryHandler(
      claim,
      options,
      definition.handler,
      controller,
      heartbeat,
    );
    if (cancellationRequested) {
      await completeEventDeliveryFailure(
        claim,
        new Error("Delivery cancelled"),
      );
    }
  } catch (error) {
    try {
      if (!controller.signal.aborted || cancellationRequested) {
        await completeEventDeliveryFailure(claim, error);
      }
    } catch (transitionError) {
      getLogger().error(
        "Event delivery terminal transition failed",
        transitionError,
      );
    }
  }
}
