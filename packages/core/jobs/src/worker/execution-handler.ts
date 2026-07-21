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
  settleHeartbeat: () => Promise<void>,
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
    const context = createJobRunContext(claim, controller, options);
    const result = normalizeJobResult(await handler(claim.payload, context));
    stopHeartbeat();
    await settleHeartbeat();
    if (!controller.signal.aborted) await completeJobSuccess(claim, result);
  } finally {
    stopHeartbeat();
    await settleHeartbeat();
    controller.signal.removeEventListener("abort", stopHeartbeat);
  }
}
