import { cleanupExpiredIdempotency } from "@damatjs/durability";
import { reconcileExpiredJobLeases } from "./reconcileLeases";
import { reconcileJobRetries } from "./reconcileRetries";
import { reconcileJobSchedules } from "./reconcileSchedules";
import { runJobRetention } from "./retention";

export interface JobReconcilePassOptions {
  workerId: string;
  queue: string;
  batchSize: number;
  retentionMs: number;
  includeRetention: boolean;
}

export async function reconcileJobWork(
  options: JobReconcilePassOptions,
): Promise<void> {
  const scope = { limit: options.batchSize, queue: options.queue };
  await reconcileExpiredJobLeases(scope);
  await reconcileJobRetries(scope);
  await reconcileJobSchedules(scope);
  await cleanupExpiredIdempotency({ limit: options.batchSize });
  if (!options.includeRetention) return;
  await runJobRetention({
    actor: { id: options.workerId, type: "system" },
    queue: options.queue,
    batchSize: options.batchSize,
    terminalBefore: new Date(Date.now() - options.retentionMs),
  });
}
