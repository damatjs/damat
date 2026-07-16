import { createJobRunContext } from "../context/create";
import { normalizeJobResult } from "../context/result";
import type { JobHandler } from "../definitions/types";
import { completeJobSuccess } from "./succeed";
import type { ClaimedJobRun, ExecuteJobOptions } from "./types";

export async function runJobHandler(
  claim: ClaimedJobRun,
  options: ExecuteJobOptions,
  handler: JobHandler,
  controller: AbortController,
  heartbeat: () => Promise<void>,
  setStopHeartbeat: (stop: () => void) => void,
): Promise<void> {
  const timer = setInterval(
    () =>
      void heartbeat().catch(() => {
        controller.abort();
        clearInterval(timer);
      }),
    options.heartbeatIntervalMs,
  );
  const stopHeartbeat = () => clearInterval(timer);
  setStopHeartbeat(stopHeartbeat);
  try {
    const context = createJobRunContext(claim, controller, options);
    const result = normalizeJobResult(await handler(claim.payload, context));
    if (!controller.signal.aborted) await completeJobSuccess(claim, result);
  } finally {
    stopHeartbeat();
  }
}
