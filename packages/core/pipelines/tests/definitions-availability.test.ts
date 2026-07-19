import { afterEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipelineAction,
  pipelineCapabilityErrors,
  registerPipelineWorkflow,
} from "../src";

afterEach(clearPipelineRuntime);
const unique = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

test("availability reports unknown task and compensation capabilities", () => {
  const knownAction = unique("known-action");
  const knownWorkflow = unique("known-workflow");
  definePipelineAction({ name: knownAction, handler: () => null });
  registerPipelineWorkflow({ name: knownWorkflow } as never);
  const errors = pipelineCapabilityErrors({
    start: "action",
    edges: [],
    nodes: [
      { id: "action", kind: "action", name: "missing-action" },
      { id: "workflow", kind: "workflow", name: "missing-workflow" },
      { id: "job", kind: "job", name: "missing-job" },
      {
        id: "ca",
        kind: "action",
        name: knownAction,
        compensateWith: { kind: "action", name: "missing-ca" },
      },
      {
        id: "cw",
        kind: "workflow",
        name: knownWorkflow,
        compensateWith: { kind: "workflow", name: "missing-cw" },
      },
      {
        id: "cj",
        kind: "action",
        name: knownAction,
        compensateWith: { kind: "job", name: "missing-cj" },
      },
    ],
  });
  expect(errors).toEqual(
    expect.arrayContaining([
      'Unknown action "missing-action"',
      'Unknown workflow "missing-workflow"',
      'Unknown job "missing-job"',
      'Unknown compensation action "missing-ca"',
      'Unknown compensation workflow "missing-cw"',
      'Unknown compensation job "missing-cj"',
    ]),
  );
});
