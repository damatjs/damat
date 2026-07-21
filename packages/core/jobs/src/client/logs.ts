import type { DurabilityExecutor } from "@damatjs/durability";
import { findJobLogs, type JobLog } from "../repositories";

export function listJobLogs(
  runId: string,
  executor?: DurabilityExecutor,
): Promise<JobLog[]> {
  return findJobLogs(runId, executor);
}
