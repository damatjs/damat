import { afterEach, expect, test } from "bun:test";
import { getJobDefinition } from "@damatjs/jobs";
import {
  clearPipelineRuntime,
  PIPELINE_EXECUTOR_JOB,
  registerPipelineExecutorJob,
  registerPipelineWorkflow,
} from "../src";

afterEach(clearPipelineRuntime);
const context = {
  signal: new AbortController().signal,
  log: async () => {},
} as never;
const payload = (capability: string, input: unknown) => ({
  pipelineRunId: "run",
  nodeExecutionId: "execution",
  nodeId: "node",
  kind: "workflow" as const,
  capability,
  input,
});
const execute = (capability: string, input: unknown) =>
  getJobDefinition(PIPELINE_EXECUTOR_JOB)!.handler(
    payload(capability, input),
    context,
  );

test("pipeline executor invokes registered durable workflows", async () => {
  registerPipelineExecutorJob();
  const name = `executor-workflow-${crypto.randomUUID()}`;
  const calls: unknown[] = [];
  registerPipelineWorkflow(
    {
      name,
      execute: async (input: unknown, metadata: unknown, options: unknown) => {
        calls.push([input, metadata, options]);
        return { success: true, result: 4 };
      },
    } as never,
    { inputSchema: { type: "number" }, outputSchema: { type: "number" } },
  );
  expect(await execute(name, 3)).toBe(4);
  expect(calls).toHaveLength(1);
  await expect(execute(name, "bad")).rejects.toThrow(`${name}.input`);
  await expect(execute(`missing-${crypto.randomUUID()}`, 1)).rejects.toThrow(
    "Unknown pipeline workflow",
  );
});

test("pipeline executor propagates workflow failure and invalid output", async () => {
  registerPipelineExecutorJob();
  const failed = `executor-failed-${crypto.randomUUID()}`;
  registerPipelineWorkflow({
    name: failed,
    execute: async () => ({
      success: false,
      error: new Error("workflow failed"),
    }),
  } as never);
  await expect(execute(failed, null)).rejects.toThrow("workflow failed");
  const invalid = `executor-invalid-${crypto.randomUUID()}`;
  registerPipelineWorkflow(
    {
      name: invalid,
      execute: async () => ({ success: true, result: "bad" }),
    } as never,
    { outputSchema: { type: "number" } },
  );
  await expect(execute(invalid, null)).rejects.toThrow(`${invalid}.output`);
});
