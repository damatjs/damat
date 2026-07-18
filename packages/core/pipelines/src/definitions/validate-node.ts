import type { PipelineNode } from "./manifest";
import {
  validatePipelineExpression,
  validatePipelineValue,
} from "./validate-value";
import { validatePipelineNodeIdentity } from "./validate-node-identity";
import { validatePipelineNodePolicy } from "./validate-node-policy";

export function validatePipelineNode(node: PipelineNode): void {
  validatePipelineNodeIdentity(node);
  validatePipelineNodePolicy(node);
  if (node.input !== undefined)
    validatePipelineValue(node.input, `node.${node.id}.input`);
  if (node.kind === "condition") {
    if (!node.expression)
      throw new Error(`Pipeline condition "${node.id}" requires an expression`);
    validatePipelineExpression(node.expression, `node.${node.id}.expression`);
  }
  if (node.kind === "foreach")
    validatePipelineValue(node.items, `node.${node.id}.items`);
  if (node.kind === "loop")
    validatePipelineExpression(node.until, `node.${node.id}.until`);
  if (node.compensateWith?.input !== undefined) {
    validatePipelineValue(
      node.compensateWith.input,
      `node.${node.id}.compensation.input`,
    );
  }
}
