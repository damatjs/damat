import {
  cleanupExpiredIdempotency,
  cleanupPublishedAccelerationSignals,
  getRetentionOverride,
  getDurabilityClient,
} from "@damatjs/durability";
import { reconcileExpiredJobLeases } from "./reconcileLeases";
import { reconcileJobRetries } from "./reconcileRetries";
import { reconcileJobSchedules } from "./reconcileSchedules";
import { runJobRetention } from "./retention";

export interface JobReconcilePassOptions {
  workerId: string;
  queue: string;
  batchSize: number;
  retentionMs: import("@damatjs/durability").RetentionDuration;
  includeRetention: boolean;
}

export async function reconcileJobWork(
  options: JobReconcilePassOptions,
): Promise<void> {
  const scope = { limit: options.batchSize, queue: options.queue };
  await getDurabilityClient().transaction(async (executor) => {
    await reconcileExpiredJobLeases({ ...scope, executor });
    await reconcileJobRetries({ ...scope, executor });
    await reconcileJobSchedules({ ...scope, executor });
    await cleanupExpiredIdempotency({
      limit: options.batchSize,
      executor,
    });
    await cleanupPublishedAccelerationSignals({
      limit: options.batchSize,
      executor,
    });
  });
  if (!options.includeRetention) return;
  const override = await getRetentionOverride("job", options.queue);
  const retentionMs = override?.retentionMs ?? options.retentionMs;
  if (retentionMs === "forever") return;
  await runJobRetention({
    actor: { id: options.workerId, type: "system" },
    queue: options.queue,
    batchSize: options.batchSize,
    terminalBefore: new Date(Date.now() - retentionMs),
  });
}
