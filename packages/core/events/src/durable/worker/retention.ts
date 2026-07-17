import {
  getDurabilityClient,
  type DurabilityClient,
  type WorkActor,
} from "@damatjs/durability";
import { getLogger } from "@damatjs/logger";
import type { EventConsumerIdentity } from "./types";
import { resolveReconcileLimit } from "./reconcile-options";
import {
  eventRetentionError,
  recordEventRetention,
  validateEventRetentionActor,
} from "./retention-audit";
import {
  eventRetentionDetails,
  performEventRetention,
} from "./retention-operation";

export interface EventRetentionOptions {
  actor: WorkActor;
  terminalBefore?: Date;
  batchSize?: number;
  consumers?: EventConsumerIdentity[];
  client?: DurabilityClient;
}

export interface EventRetentionResult {
  deletedEvents: number;
}

export async function runEventRetention(
  options: EventRetentionOptions,
): Promise<EventRetentionResult> {
  if (!options) throw new Error("retention options are required");
  validateEventRetentionActor(options.actor);
  const limit = resolveReconcileLimit(options.batchSize);
  const client = options.client ?? getDurabilityClient();
  const details = eventRetentionDetails(options, limit);
  await recordEventRetention(client, options.actor, "requested", details);
  try {
    return await performEventRetention(client, options, limit, details);
  } catch (error) {
    try {
      await recordEventRetention(client, options.actor, "failed", {
        ...details,
        ...eventRetentionError(error),
      });
    } catch (auditError) {
      getLogger().error(
        "Event retention failure audit could not be recorded",
        auditError,
      );
    }
    throw error;
  }
}
