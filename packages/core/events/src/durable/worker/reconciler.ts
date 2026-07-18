import {
  cleanupExpiredIdempotency,
  cleanupPublishedAccelerationSignals,
  getDurabilityClient,
} from "@damatjs/durability";
import { reconcileExpiredEventDeliveryLeases } from "./reconcileLeases";
import { reconcileEventDeliveryRetries } from "./reconcileRetries";
import { runEventRetention } from "./retention";
import type { ResolvedEventWorkerOptions } from "./runtime-options";

export async function reconcileEventWork(
  id: string,
  options: ResolvedEventWorkerOptions,
  includeRetention: boolean,
): Promise<void> {
  const scope = {
    limit: options.reconcileBatchSize,
    consumers: options.consumers,
  };
  await getDurabilityClient().transaction(async (executor) => {
    await reconcileExpiredEventDeliveryLeases({ ...scope, executor });
    await reconcileEventDeliveryRetries({ ...scope, executor });
    if (options.cleanupSharedIdempotency) {
      await cleanupExpiredIdempotency({
        limit: options.reconcileBatchSize,
        executor,
      });
      await cleanupPublishedAccelerationSignals({
        limit: options.reconcileBatchSize,
        executor,
      });
    }
  });
  if (includeRetention)
    await runEventRetention({
      actor: { id, type: "system" },
      batchSize: options.reconcileBatchSize,
    });
}
