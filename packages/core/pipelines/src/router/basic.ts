import type { DurabilityExecutor } from "@damatjs/durability";
import { publishDurableEvent } from "@damatjs/events";
import {
  getPipelineEvent,
  validatePipelineSchema,
  type PipelineControlNode,
  type PipelineEventNode,
} from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { evaluatePipelineExpression, evaluatePipelineValue } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";
import { completeForwardNode } from "./outcome";
import { waitNode } from "./update";

export async function processControlNode(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineControlNode,
): Promise<void> {
  if (node.kind === "join") {
    await waitNode(executor, execution);
    return;
  }
  const context = await loadEvaluationContext(executor, run);
  const output =
    node.kind === "condition" && node.expression
      ? evaluatePipelineExpression(node.expression, context)
      : true;
  await completeForwardNode(executor, run, execution, output);
}

export async function processPublishNode(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineEventNode,
): Promise<void> {
  const context = await loadEvaluationContext(executor, run);
  const payload = evaluatePipelineValue(node.input, context) ?? execution.input;
  validatePipelineSchema(
    payload,
    getPipelineEvent(node.event)?.inputSchema,
    `${node.event}.input`,
  );
  const correlation = evaluatePipelineValue(node.correlation, context);
  const event = await publishDurableEvent(node.event, payload, {
    executor,
    correlationId:
      correlation === undefined
        ? (run.correlation_id ?? run.id)
        : String(correlation),
    causationId: run.id,
    idempotencyKey: `${run.id}:${execution.id}`,
  });
  await completeForwardNode(executor, run, execution, { eventId: event.id });
}
