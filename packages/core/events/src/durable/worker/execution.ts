import { getLogger } from "@damatjs/logger";
import { getDurableEventConsumer } from "../definitions/registry";
import { runEventDeliveryHandler } from "./execution-handler";
import { createEventHeartbeatControl } from "./execution-heartbeat";
import type { DurabilityExecutor } from "@damatjs/durability";
import { completeEventDeliveryFailure } from "./outcome";
import type {
  ClaimedEventDelivery,
  ExecuteEventDeliveryOptions,
} from "./types";
import { resolveExecutionOptions } from "./execution-options";

export interface EventDeliveryExecution {
  promise: Promise<void>;
  abort(): Promise<void>;
  heartbeat(executor?: DurabilityExecutor): Promise<void>;
}

export function startEventDeliveryExecution(
  claim: ClaimedEventDelivery,
  input: ExecuteEventDeliveryOptions = {},
): EventDeliveryExecution {
  const controller = new AbortController();
  const options = resolveExecutionOptions(input);
  const heartbeat = createEventHeartbeatControl(
    claim,
    options.leaseMs,
    controller,
  );
  return {
    promise: runClaim(claim, options, controller, heartbeat),
    abort: async () => {
      controller.abort();
      await heartbeat.stop();
    },
    heartbeat: heartbeat.run,
  };
}

async function runClaim(
  claim: ClaimedEventDelivery,
  options: Required<
    Pick<ExecuteEventDeliveryOptions, "leaseMs" | "heartbeatIntervalMs">
  > &
    ExecuteEventDeliveryOptions,
  controller: AbortController,
  heartbeat: ReturnType<typeof createEventHeartbeatControl>,
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
  try {
    if (!options.batchHeartbeats) await heartbeat.run();
    if (heartbeat.cancellationRequested) throw new Error("Delivery cancelled");
    if (controller.signal.aborted) return;
    await runEventDeliveryHandler(
      claim,
      options,
      definition.handler,
      controller,
      heartbeat.run,
      heartbeat.stop,
    );
    if (heartbeat.cancellationRequested) {
      await completeEventDeliveryFailure(
        claim,
        new Error("Delivery cancelled"),
      );
    }
  } catch (error) {
    try {
      if (!controller.signal.aborted || heartbeat.cancellationRequested) {
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
