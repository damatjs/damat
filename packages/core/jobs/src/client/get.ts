import type { DurabilityExecutor } from "@damatjs/durability";
import { findJobRun, type JobRun } from "../repositories";

export function getJobRun(
  id: string,
  executor?: DurabilityExecutor,
): Promise<JobRun | undefined> {
  return findJobRun(id, executor);
}
