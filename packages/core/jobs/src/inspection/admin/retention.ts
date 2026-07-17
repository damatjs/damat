import {
  validateWorkActor,
  type BoundedRetentionRequest,
  type WorkActor,
} from "@damatjs/durability";
import {
  runJobRetention,
  type JobRetentionResult,
} from "../../worker/retention";
import type { ResolvedInspectionOptions } from "../config";

export function runInspectedJobRetention(
  request: BoundedRetentionRequest,
  actor: WorkActor,
  options: ResolvedInspectionOptions,
): Promise<JobRetentionResult> {
  validateWorkActor(actor);
  return runJobRetention({
    actor,
    client: options.client,
    requestId: crypto.randomUUID(),
    ...(request.terminalBefore
      ? { terminalBefore: request.terminalBefore }
      : {}),
    ...(request.batchSize !== undefined
      ? { batchSize: request.batchSize }
      : {}),
  });
}
