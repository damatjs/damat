import type { DurabilityExecutor } from "@damatjs/durability";
import { findJobAttempts, type JobAttempt } from "../repositories";

export function listJobAttempts(
  runId: string,
  executor?: DurabilityExecutor,
): Promise<JobAttempt[]> {
  return findJobAttempts(runId, executor);
}
