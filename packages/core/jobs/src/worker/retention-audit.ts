import {
  recordMaintenanceActivity,
  type DurabilityExecutor,
  type MaintenanceStatus,
  type WorkActor,
} from "@damatjs/durability";

export function recordJobRetention(
  executor: DurabilityExecutor,
  actor: WorkActor,
  status: MaintenanceStatus,
  details: Record<string, unknown>,
  scope?: string,
): Promise<unknown> {
  return recordMaintenanceActivity({
    operation: "job_retention",
    kind: "job",
    ...(scope ? { scope } : {}),
    status,
    actor,
    details,
    ...(status === "requested" ? {} : { completedAt: new Date() }),
    executor,
  });
}

export function retentionError(error: unknown): Record<string, unknown> {
  return {
    message: error instanceof Error ? error.message : String(error),
  };
}

export function validateRetentionActor(actor: WorkActor | undefined): void {
  if (!actor?.id?.trim())
    throw new Error("retention actor id must not be blank");
  if (!["user", "service", "system"].includes(actor.type)) {
    throw new Error("retention actor type is invalid");
  }
}
