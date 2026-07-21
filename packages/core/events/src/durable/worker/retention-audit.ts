import {
  recordMaintenanceActivity,
  type DurabilityExecutor,
  type MaintenanceStatus,
  type WorkActor,
} from "@damatjs/durability";

export function recordEventRetention(
  executor: DurabilityExecutor,
  actor: WorkActor,
  status: MaintenanceStatus,
  details: Record<string, unknown>,
): Promise<unknown> {
  return recordMaintenanceActivity({
    operation: "event_retention",
    kind: "event",
    status,
    actor,
    details,
    ...(status === "requested" ? {} : { completedAt: new Date() }),
    executor,
  });
}

export function validateEventRetentionActor(actor: WorkActor | undefined) {
  if (!actor?.id?.trim())
    throw new Error("retention actor id must not be blank");
  if (!["user", "service", "system"].includes(actor.type)) {
    throw new Error("retention actor type is invalid");
  }
}

export const eventRetentionError = (error: unknown) => ({
  message: error instanceof Error ? error.message : String(error),
});
