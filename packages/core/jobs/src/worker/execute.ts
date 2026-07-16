import { getLogger } from "@damatjs/logger";
import { getJobDefinition } from "../definitions/registry";
import { completeJobCancellation } from "./cancel";
import { runJobHandler } from "./execution-handler";
import { completeJobFailure } from "./fail";
import { heartbeatJobClaim } from "./heartbeat";
import type { ClaimedJobRun, ExecuteJobOptions } from "./types";

export interface JobExecution {
  promise: Promise<void>;
  abort(): void;
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
  let stopHeartbeat = () => {};
  const promise = runClaim(claim, options, controller, (stop) => {
    stopHeartbeat = stop;
  });
  return {
    promise,
    abort: () => {
      controller.abort();
      stopHeartbeat();
    },
  };
}

async function runClaim(
  claim: ClaimedJobRun,
  options: ExecuteJobOptions,
  controller: AbortController,
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
  let cancellationRequested = false;
  const heartbeat = async () => {
    const state = await heartbeatJobClaim(claim, {
      leaseMs: options.leaseMs ?? 30_000,
    });
    cancellationRequested ||= state.cancellationRequested;
    if (state.cancellationRequested) controller.abort();
  };
  try {
    await heartbeat();
    if (cancellationRequested) {
      await completeJobCancellation(claim);
      return;
    }
    if (controller.signal.aborted) return;
    await runJobHandler(
      claim,
      options,
      definition.handler,
      controller,
      heartbeat,
      setStopHeartbeat,
    );
    if (cancellationRequested) await completeJobCancellation(claim);
  } catch (error) {
    try {
      if (cancellationRequested) await completeJobCancellation(claim);
      else if (controller.signal.aborted) return;
      else await completeJobFailure(claim, error);
    } catch (transitionError) {
      getLogger().error("Job terminal transition failed", transitionError);
    }
  }
}
