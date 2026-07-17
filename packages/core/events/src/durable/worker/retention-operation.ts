import type { DurabilityClient } from "@damatjs/durability";
import { encodeReconcileConsumers } from "./reconcile-options";
import { recordEventRetention } from "./retention-audit";
import { deleteExpiredDurableEvents } from "./retention-delete";
import type { EventRetentionOptions, EventRetentionResult } from "./retention";

export function eventRetentionDetails(
  options: EventRetentionOptions,
  batchSize: number,
): Record<string, unknown> {
  return {
    batchSize,
    terminalBefore: (options.terminalBefore ?? new Date()).toISOString(),
    consumers: options.consumers ?? null,
  };
}

export function performEventRetention(
  client: DurabilityClient,
  options: EventRetentionOptions,
  limit: number,
  details: Record<string, unknown>,
): Promise<EventRetentionResult> {
  return client.transaction(async (executor) => {
    const result = {
      deletedEvents: await deleteExpiredDurableEvents(
        executor,
        options.terminalBefore ?? new Date(),
        limit,
        encodeReconcileConsumers(options.consumers),
      ),
    };
    await recordEventRetention(executor, options.actor, "completed", {
      ...details,
      ...result,
    });
    return result;
  });
}
