import { getLogger } from "@damatjs/logger";
import { createJobRunContext } from "../context/create";
import { normalizeJobResult } from "../context/result";
import { getJobDefinition } from "../definitions/registry";
import { completeJobCancellation } from "./cancel";
import { completeJobFailure } from "./fail";
import { heartbeatJobClaim } from "./heartbeat";
import { completeJobSuccess } from "./succeed";
import type { ClaimedJobRun, ExecuteJobOptions } from "./types";

export async function executeJobClaim(
  claim: ClaimedJobRun,
  options: ExecuteJobOptions,
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
  const controller = new AbortController();
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
    await runHandler(claim, options, definition.handler, controller, heartbeat);
  } catch (error) {
    try {
      if (cancellationRequested) await completeJobCancellation(claim);
      else await completeJobFailure(claim, error);
    } catch (transitionError) {
      getLogger().error("Job terminal transition failed", transitionError);
    }
  }
}

async function runHandler(
  claim: ClaimedJobRun,
  options: ExecuteJobOptions,
  handler: (payload: unknown, context: never) => unknown | Promise<unknown>,
  controller: AbortController,
  heartbeat: () => Promise<void>,
): Promise<void> {
  const timer = setInterval(() => {
    void heartbeat().catch(() => controller.abort());
  }, options.heartbeatIntervalMs);
  try {
    const context = createJobRunContext(claim, controller, options);
    const result = normalizeJobResult(
      await handler(claim.payload, context as never),
    );
    await completeJobSuccess(claim, result);
  } finally {
    clearInterval(timer);
  }
}
