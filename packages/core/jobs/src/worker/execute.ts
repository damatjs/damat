import { getLogger } from "@damatjs/logger";
import { getJobDefinition } from "../definitions/registry";
import { completeJobCancellation } from "./cancel";
import { runJobHandler } from "./execution-handler";
import { completeJobFailure } from "./fail";
import { createJobHeartbeatControl } from "./execution-heartbeat";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { ClaimedJobRun, ExecuteJobOptions } from "./types";

export interface JobExecution {
  promise: Promise<void>;
  abort(): void;
  heartbeat(executor?: DurabilityExecutor): Promise<void>;
}

export async function executeJobClaim(
  claim: ClaimedJobRun,
  options: ExecuteJobOptions,
): Promise<void> {
  await startJobExecution(claim, options).promise;
}

export function startJobExecution(
  claim: ClaimedJobRun,
  options: ExecuteJobOptions,
): JobExecution {
  const controller = new AbortController();
  const heartbeat = createJobHeartbeatControl(
    claim,
    options.leaseMs ?? 30_000,
    controller,
  );
  let stopHeartbeat = () => {};
  const promise = runClaim(claim, options, controller, heartbeat, (stop) => {
    stopHeartbeat = stop;
  });
  return {
    promise,
    abort: () => {
      controller.abort();
      stopHeartbeat();
    },
    heartbeat: heartbeat.run,
  };
}

async function runClaim(
  claim: ClaimedJobRun,
  options: ExecuteJobOptions,
  controller: AbortController,
  heartbeat: ReturnType<typeof createJobHeartbeatControl>,
  setStopHeartbeat: (stop: () => void) => void,
): Promise<void> {
  const definition = getJobDefinition(claim.name);
  if (!definition) {
    await completeJobFailure(
      claim,
      new Error(`Unknown job "${claim.name}" — no defineJob() in this process`),
      { forceDeadLetter: true },
    );
    return;
  }
  try {
    if (!options.batchHeartbeats) await heartbeat.run();
    if (heartbeat.cancellationRequested) {
      await completeJobCancellation(claim);
      return;
    }
    if (controller.signal.aborted) return;
    await runJobHandler(
      claim,
      options,
      definition.handler,
      controller,
      heartbeat.run,
      setStopHeartbeat,
    );
    if (heartbeat.cancellationRequested) await completeJobCancellation(claim);
  } catch (error) {
    try {
      if (heartbeat.cancellationRequested) await completeJobCancellation(claim);
      else if (controller.signal.aborted) return;
      else await completeJobFailure(claim, error);
    } catch (transitionError) {
      getLogger().error("Job terminal transition failed", transitionError);
    }
  }
}
