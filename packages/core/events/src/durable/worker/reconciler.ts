import { cleanupExpiredIdempotency } from "@damatjs/durability";
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
  await reconcileExpiredEventDeliveryLeases(scope);
  await reconcileEventDeliveryRetries(scope);
  await cleanupExpiredIdempotency({ limit: options.reconcileBatchSize });
  if (includeRetention)
    await runEventRetention({
      actor: { id, type: "system" },
      batchSize: options.reconcileBatchSize,
    });
}
