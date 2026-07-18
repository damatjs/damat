import { afterEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipelineAction,
  getPipelineAction,
  getPipelineCapabilityCatalog,
  getPipelineEvent,
  getPipelineJob,
  getPipelineWorkflow,
  registerPipelineEvent,
  registerPipelineJob,
  registerPipelineWorkflow,
} from "../src";

afterEach(clearPipelineRuntime);

test("capability registry owns actions, workflows, jobs, and events", () => {
  const action = definePipelineAction({
    name: "action",
    handler: (input) => input,
  });
  const workflow = registerPipelineWorkflow(
    { name: "workflow" } as never,
    { description: "durable workflow" },
  );
  const job = registerPipelineJob({ name: "job" });
  const event = registerPipelineEvent({ name: "event", hidden: true });
  expect(getPipelineAction("action")).toBe(action);
  expect(getPipelineWorkflow("workflow")).toBe(workflow);
  expect(getPipelineJob("job")).toBe(job);
  expect(getPipelineEvent("event")).toBe(event);
  expect(getPipelineCapabilityCatalog()).toEqual({
    actions: [action],
    workflows: [{ name: "workflow", description: "durable workflow" }],
    jobs: [job],
    events: [event],
  });
});

test("capability names must be present and unique per kind", () => {
  expect(() =>
    definePipelineAction({ name: " ", handler: () => null }),
  ).toThrow("action name is required");
  definePipelineAction({ name: "same", handler: () => null });
  expect(() =>
    definePipelineAction({ name: "same", handler: () => null }),
  ).toThrow("already registered");
  expect(() => registerPipelineJob({ name: "" })).toThrow(
    "job name is required",
  );
  expect(() => registerPipelineEvent({ name: "" })).toThrow(
    "event name is required",
  );
  expect(() => registerPipelineWorkflow({ name: "" } as never)).toThrow(
    "workflow name is required",
  );
});
