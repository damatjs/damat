import type { PipelineExpression, PipelineValue } from "../definitions";
import type { PipelineEvaluationContext } from "./evaluation-context";
import { readReference } from "./evaluation-context";

export function evaluatePipelineValue(
  value: PipelineValue | undefined,
  context: PipelineEvaluationContext,
): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value))
    return value.map((entry) => evaluatePipelineValue(entry, context));
  if (!value || typeof value !== "object") return value;
  if ("$ref" in value && typeof value.$ref === "string")
    return readReference(context, value.$ref);
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      evaluatePipelineValue(entry as PipelineValue, context),
    ]),
  );
}

export function evaluatePipelineExpression(
  expression: PipelineExpression,
  context: PipelineEvaluationContext,
): boolean {
  if (expression.op === "exists")
    return evaluatePipelineValue(expression.value, context) !== undefined;
  if (expression.op === "not")
    return !evaluatePipelineExpression(expression.value, context);
  if (expression.op === "and")
    return expression.values.every((value) =>
      evaluatePipelineExpression(value, context),
    );
  if (expression.op === "or")
    return expression.values.some((value) =>
      evaluatePipelineExpression(value, context),
    );
  if (!("left" in expression)) return false;
  const left = evaluatePipelineValue(expression.left, context);
  const right = evaluatePipelineValue(expression.right, context);
  if (expression.op === "eq") return left === right;
  if (expression.op === "neq") return left !== right;
  if (expression.op === "gt") return compare(left, right) > 0;
  if (expression.op === "gte") return compare(left, right) >= 0;
  if (expression.op === "lt") return compare(left, right) < 0;
  if (expression.op === "lte") return compare(left, right) <= 0;
  return Array.isArray(right) && right.includes(left);
}

function compare(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number")
    return left - right;
  if (typeof left === "string" && typeof right === "string")
    return left.localeCompare(right);
  return Number.NaN;
}
