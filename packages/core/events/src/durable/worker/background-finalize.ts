import { getLogger } from "@damatjs/logger";
import type { EventWorkerRuntimeFinalizer } from "./runtime-finalizer";

export async function finishEventWorkerBackground(
  finalizer: EventWorkerRuntimeFinalizer,
): Promise<void> {
  if (!finalizer.isWaitingForDrain) return;
  await finalizer
    .finish()
    .catch((error) =>
      getLogger().error("Event worker background finalization failed", error),
    );
}
