import type { DurabilityExecutor } from "@damatjs/durability";
import { findJobActivity, type JobActivity } from "../repositories";

export function listJobActivity(
  runId: string,
  executor?: DurabilityExecutor,
): Promise<JobActivity[]> {
  return findJobActivity(runId, executor);
}
