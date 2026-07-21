import type { PipelineNode } from "./manifest";

const TASKS = new Set(["action", "job", "workflow"]);
const KINDS = new Set([
  ...TASKS,
  "event.publish",
  "event.wait",
  "signal.wait",
  "delay",
  "condition",
  "fork",
  "join",
  "child",
  "foreach",
  "loop",
]);

export function validatePipelineNodeIdentity(node: PipelineNode): void {
  if (!KINDS.has(node.kind))
    throw new Error(`Unknown pipeline node kind "${node.kind}"`);
  if (!node.id?.trim() || node.id.includes(".") || node.id.length > 200) {
    throw new Error(
      "Pipeline node id is required and cannot contain dots or exceed 200 characters",
    );
  }
  if (TASKS.has(node.kind) && !("name" in node && node.name.trim())) {
    throw new Error(`Pipeline ${node.kind} node "${node.id}" requires a name`);
  }
  if (
    (node.kind === "event.publish" || node.kind === "event.wait") &&
    !node.event.trim()
  ) {
    throw new Error(`Pipeline event node "${node.id}" requires an event`);
  }
  if (node.kind === "signal.wait" && !node.signal.trim()) {
    throw new Error(`Pipeline signal node "${node.id}" requires a signal`);
  }
  if (
    ["child", "foreach", "loop"].includes(node.kind) &&
    !("pipeline" in node && node.pipeline.trim())
  ) {
    throw new Error(
      `Pipeline ${node.kind} node "${node.id}" requires a child pipeline`,
    );
  }
}
