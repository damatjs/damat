import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineTaskNode } from "../definitions";
import type { NodeExecutionRow } from "../repositories";
import { evaluatePipelineValue } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";
import { processControlNode, processPublishNode } from "./basic";
import { dispatchCompensation } from "./compensation";
import { loadPipelineRunRow } from "./load";
import { failForwardNode, serializePipelineError } from "./outcome";
import { dispatchTask } from "./task";
import { processChild } from "./wait-child";
import { processDelay } from "./wait-delay";
import { processEventWait } from "./wait-event";
import { processForEach } from "./wait-foreach";
import { processJoin } from "./wait-join";
import { processLoop } from "./wait-loop";
import { processSignalWait } from "./wait-signal";

export async function processRoutableNode(
  executor: DurabilityExecutor,
  execution: NodeExecutionRow,
): Promise<string | undefined> {
  const run = await loadPipelineRunRow(executor, execution.run_id);
  const node = run.manifest.nodes.find(
    (value) => value.id === execution.node_id,
  );
  if (!node) throw new Error(`Pipeline node "${execution.node_id}" is missing`);
  try {
    if (execution.phase === "compensation")
      return dispatchCompensation(executor, run, execution);
    if (["action", "job", "workflow"].includes(node.kind)) {
      const context = await loadEvaluationContext(executor, run);
      const input =
        evaluatePipelineValue(node.input, context) ?? execution.input;
      return dispatchTask(
        executor,
        run,
        execution,
        node as PipelineTaskNode,
        input,
      );
    }
    if (node.kind === "event.publish")
      await processPublishNode(executor, run, execution, node);
    else if (node.kind === "event.wait")
      await processEventWait(executor, run, execution, node);
    else if (node.kind === "signal.wait")
      await processSignalWait(executor, run, execution, node);
    else if (node.kind === "delay")
      await processDelay(executor, run, execution, node);
    else if (node.kind === "join")
      await processJoin(executor, run, execution, node);
    else if (node.kind === "condition" || node.kind === "fork") {
      await processControlNode(executor, run, execution, node);
    } else if (node.kind === "child")
      await processChild(executor, run, execution, node);
    else if (node.kind === "foreach")
      await processForEach(executor, run, execution, node);
    else if (node.kind === "loop")
      await processLoop(executor, run, execution, node);
  } catch (error) {
    await failForwardNode(
      executor,
      run,
      execution,
      node,
      serializePipelineError(error),
    );
  }
  return undefined;
}
