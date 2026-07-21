import { redactValue } from "@damatjs/durability";
import type { PipelineNodeExecution, PipelineRun } from "../repositories";
import type { ResolvedPipelineInspectionOptions } from "./config";

export function visibleRun(
  run: PipelineRun,
  options: ResolvedPipelineInspectionOptions,
) {
  const base = { ...run };
  if (options.visibility !== "full") {
    delete base.input;
    delete base.output;
  } else {
    base.input = redactValue(run.input, options.redaction);
    if (run.output !== undefined)
      base.output = redactValue(run.output, options.redaction);
  }
  if (run.error) base.error = visibleError(run.error, options);
  if (options.visibility === "hidden") {
    base.metadata = {};
    base.trigger = {};
  } else {
    base.metadata = redactValue(run.metadata, options.redaction) as Record<
      string,
      unknown
    >;
    base.trigger = redactValue(run.trigger, options.redaction) as Record<
      string,
      unknown
    >;
  }
  return base;
}

export function visibleNode(
  node: PipelineNodeExecution,
  options: ResolvedPipelineInspectionOptions,
): PipelineNodeExecution {
  const value = { ...node };
  if (options.visibility !== "full") {
    delete value.input;
    delete value.output;
  } else {
    if (value.input !== undefined)
      value.input = redactValue(value.input, options.redaction);
    if (value.output !== undefined)
      value.output = redactValue(value.output, options.redaction);
  }
  if (value.error) value.error = visibleError(value.error, options);
  return value;
}

function visibleError(
  error: Record<string, unknown>,
  options: ResolvedPipelineInspectionOptions,
): Record<string, unknown> {
  if (options.visibility === "hidden") {
    return typeof error.name === "string" ? { name: error.name } : {};
  }
  return redactValue(error, options.redaction) as Record<string, unknown>;
}
