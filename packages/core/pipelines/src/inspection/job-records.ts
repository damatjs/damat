import type { DurabilityExecutor } from "@damatjs/durability";
import { redactValue } from "@damatjs/durability";
import { listJobActivity, listJobAttempts, listJobLogs } from "@damatjs/jobs";
import type { PipelineNodeExecution } from "../repositories";
import type { ResolvedPipelineInspectionOptions } from "./config";

export async function readPipelineJobRecords(
  executor: DurabilityExecutor,
  nodes: PipelineNodeExecution[],
  options: ResolvedPipelineInspectionOptions,
): Promise<
  Record<string, { attempts: unknown[]; logs: unknown[]; activity: unknown[] }>
> {
  const result: Record<
    string,
    { attempts: unknown[]; logs: unknown[]; activity: unknown[] }
  > = {};
  for (const node of nodes) {
    if (!node.jobRunId) continue;
    const attempts = await listJobAttempts(node.jobRunId, executor);
    const logs = await listJobLogs(node.jobRunId, executor);
    const activity = await listJobActivity(node.jobRunId, executor);
    result[node.jobRunId] = {
      attempts: visibleRecords(attempts, options),
      logs: visibleRecords(logs, options),
      activity: visibleRecords(activity, options),
    };
  }
  return result;
}

function visibleRecords(
  values: unknown[],
  options: ResolvedPipelineInspectionOptions,
): unknown[] {
  if (options.visibility === "full")
    return redactValue(values, options.redaction) as unknown[];
  if (options.visibility === "hidden") return [];
  return values.map((value) => {
    if (!value || typeof value !== "object") return value;
    const record = { ...(value as Record<string, unknown>) };
    for (const key of [
      "payload",
      "input",
      "output",
      "result",
      "error",
      "data",
      "details",
      "message",
    ]) {
      delete record[key];
    }
    return record;
  });
}
