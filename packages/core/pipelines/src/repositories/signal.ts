import {
  recordAccelerationSignal,
  type DurabilityExecutor,
} from "@damatjs/durability";

export function recordPipelineSignal(
  executor: DurabilityExecutor,
  runId: string,
  projection: "upsert" | "remove" = "upsert",
  availableAt?: Date,
): Promise<string> {
  return recordAccelerationSignal({
    topic: "damat:pipelines:wakeup",
    kind: "pipeline",
    resourceId: runId,
    payload: { kind: "pipelines", projection },
    ...(availableAt ? { availableAt } : {}),
    executor,
  });
}
