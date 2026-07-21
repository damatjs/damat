import type { DurabilityExecutor } from "@damatjs/durability";
import { processPipelineEventTriggers } from "./events";
import { processDuePipelineSchedules } from "./schedules";

export async function processPipelineTriggers(
  executor: DurabilityExecutor,
  limit: number,
): Promise<number> {
  const schedules = await processDuePipelineSchedules(executor, limit);
  const events =
    schedules < limit
      ? await processPipelineEventTriggers(executor, limit - schedules)
      : 0;
  return schedules + events;
}
