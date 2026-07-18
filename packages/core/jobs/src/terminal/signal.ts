import {
  recordAccelerationSignal,
  type DurabilityExecutor,
} from "@damatjs/durability";
import type { ClaimedJobRun } from "../worker/types";
import { pipelineJobBinding } from "./binding";

export async function recordPipelineJobTerminal(
  executor: DurabilityExecutor,
  claim: ClaimedJobRun,
): Promise<void> {
  await recordPipelineMetadataTerminal(executor, claim.metadata);
}

export async function recordPipelineMetadataTerminal(
  executor: DurabilityExecutor,
  metadata: Record<string, unknown>,
): Promise<void> {
  const binding = pipelineJobBinding(metadata);
  if (!binding) return;
  await recordAccelerationSignal({
    topic: "damat:pipelines:wakeup",
    kind: "pipeline",
    resourceId: binding.runId,
    scope: binding.pipeline,
    payload: { kind: "pipelines", scope: binding.pipeline },
    executor,
  });
}
