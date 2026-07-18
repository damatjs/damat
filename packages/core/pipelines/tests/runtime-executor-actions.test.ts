import { afterEach, expect, test } from "bun:test";
import { getJobDefinition } from "@damatjs/jobs";
import {
  clearPipelineRuntime,
  definePipelineAction,
  PIPELINE_EXECUTOR_JOB,
  registerPipelineExecutorJob,
} from "../src";

afterEach(clearPipelineRuntime);
const context = { signal: new AbortController().signal, log: async () => {} } as never;
const payload = (capability: string, input: unknown) => ({
  pipelineRunId: "run",
  nodeExecutionId: "execution",
  nodeId: "node",
  kind: "action" as const,
  capability,
  input,
});
const handler = () => getJobDefinition(PIPELINE_EXECUTOR_JOB)!.handler;

test("pipeline executor registers once and preserves its queue", () => {
  registerPipelineExecutorJob();
  expect(getJobDefinition(PIPELINE_EXECUTOR_JOB)?.options.queue).toBe("damat-pipelines");
  expect(() => registerPipelineExecutorJob()).not.toThrow();
  expect(() => registerPipelineExecutorJob("other-pipeline-queue")).toThrow("queue changed");
});

test("pipeline executor validates and invokes action capabilities", async () => {
  registerPipelineExecutorJob();
  const name = `executor-action-${crypto.randomUUID()}`;
  let received: unknown;
  definePipelineAction({
    name,
    inputSchema: { type: "number" },
    outputSchema: { type: "number" },
    handler: (input, actionContext) => {
      received = [input, actionContext.pipelineRunId, actionContext.nodeExecutionId, actionContext.nodeId];
      return Number(input) + 1;
    },
  });
  expect(await handler()(payload(name, 2), context)).toBe(3);
  expect(received).toEqual([2, "run", "execution", "node"]);
  await expect(handler()(payload(name, "bad"), context)).rejects.toThrow(`${name}.input`);
  await expect(handler()(payload(`missing-${crypto.randomUUID()}`, 1), context)).rejects.toThrow("Unknown pipeline action");
});

test("pipeline executor validates action output schemas", async () => {
  registerPipelineExecutorJob();
  const name = `executor-output-${crypto.randomUUID()}`;
  definePipelineAction({ name, outputSchema: { type: "number" }, handler: () => "bad" });
  await expect(handler()(payload(name, null), context)).rejects.toThrow(`${name}.output`);
});
