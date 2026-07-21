import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineEventNode } from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { evaluatePipelineValue } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";
import { completeForwardNode } from "./outcome";
import { waitNode } from "./update";

interface EventMatch {
  id: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  correlation_id: string | null;
}

export async function processEventWait(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineEventNode,
): Promise<void> {
  const context = await loadEvaluationContext(executor, run);
  const correlation = evaluatePipelineValue(node.correlation, context);
  const result = await executor.query<EventMatch>(
    `SELECT "id","payload","metadata","correlation_id"
     FROM "_damat_event_outbox" WHERE "name"=$1 AND "created_at">=$2
       AND ($3::text IS NULL OR "correlation_id"=$3)
     ORDER BY "created_at","id" LIMIT 1`,
    [
      node.event,
      execution.created_at,
      correlation === undefined ? null : String(correlation),
    ],
  );
  const event = result.rows[0];
  if (!event) {
    await waitNode(executor, execution);
    return;
  }
  await completeForwardNode(executor, run, execution, {
    eventId: event.id,
    payload: event.payload,
    metadata: event.metadata,
    correlationId: event.correlation_id,
  });
}
