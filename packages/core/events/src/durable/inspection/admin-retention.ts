import {
  validateWorkActor,
  type BoundedRetentionRequest,
  type WorkActor,
} from "@damatjs/durability";
import {
  runEventRetention,
  type EventRetentionResult,
} from "../worker/retention";
import type { ResolvedEventInspectionOptions } from "./options";

export function runInspectedEventRetention(
  request: BoundedRetentionRequest,
  actor: WorkActor,
  options: ResolvedEventInspectionOptions,
): Promise<EventRetentionResult> {
  validateWorkActor(actor);
  return runEventRetention({
    actor,
    requestId: crypto.randomUUID(),
    ...(request.terminalBefore
      ? { terminalBefore: request.terminalBefore }
      : {}),
    ...(request.batchSize !== undefined
      ? { batchSize: request.batchSize }
      : {}),
    client: options.client,
  });
}
