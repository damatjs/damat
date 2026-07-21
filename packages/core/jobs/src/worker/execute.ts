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
  abort(): Promise<void>;
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
  claim: ClaimedJobRun,
  options: ExecuteJobOptions,
  controller: AbortController,
  heartbeat: ReturnType<typeof createJobHeartbeatControl>,
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
      heartbeat.stop,
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
