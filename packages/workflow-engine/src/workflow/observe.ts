import { getLogger } from "@damatjs/logger";
import type {
  WorkflowExecutionEvent,
  WorkflowExecutionObserver,
} from "../types/observer";

export async function emitWorkflowExecutionEvent(
  observer: WorkflowExecutionObserver | undefined,
  event: WorkflowExecutionEvent,
): Promise<void> {
  if (!observer) return;
  try {
    await observer.onEvent(event);
  } catch (error) {
    getLogger().warn("Workflow execution observer failed", {
      event: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
