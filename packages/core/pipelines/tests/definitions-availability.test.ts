import { afterEach, expect, test } from "bun:test";
import { defineDurableEvent } from "@damatjs/events";
import { defineJob } from "@damatjs/jobs";
import {
  clearPipelineRuntime,
  configurePipelineDefaults,
  definePipelineAction,
  pipelineCapabilityErrors,
  registerPipelineEvent,
  registerPipelineJob,
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
      { id: "ca", kind: "action", name: knownAction, compensateWith: { kind: "action", name: "missing-ca" } },
      { id: "cw", kind: "workflow", name: knownWorkflow, compensateWith: { kind: "workflow", name: "missing-cw" } },
      { id: "cj", kind: "action", name: knownAction, compensateWith: { kind: "job", name: "missing-cj" } },
    ],
  });
  expect(errors).toEqual(expect.arrayContaining([
    'Unknown action "missing-action"',
    'Unknown workflow "missing-workflow"',
    'Unknown job "missing-job"',
    'Unknown compensation action "missing-ca"',
    'Unknown compensation workflow "missing-cw"',
    'Unknown compensation job "missing-cj"',
  ]));
});

test("availability enforces service support and web-safe catalogs", () => {
  const job = unique("job");
  const event = unique("event");
  defineJob(job, async () => null);
  defineDurableEvent(event);
  const manifest = {
    start: "job",
    edges: [],
    nodes: [
      { id: "job", kind: "job" as const, name: job, compensateWith: { kind: "job" as const, name: job } },
      { id: "publish", kind: "event.publish" as const, event },
    ],
    triggers: [{ id: "trigger", kind: "event" as const, event }],
  };
  configurePipelineDefaults({ jobs: false, events: false });
  expect(pipelineCapabilityErrors(manifest)).toEqual(expect.arrayContaining([
    "Job nodes require services.jobs",
    "Compensation job nodes require services.jobs",
    "Event nodes require services.events.durable",
    "Event triggers require services.events.durable",
  ]));
  configurePipelineDefaults({ jobs: true, events: true });
  expect(pipelineCapabilityErrors(manifest, true)).toEqual(expect.arrayContaining([
    `Job "${job}" is not available to web-authored pipelines`,
    `Compensation job "${job}" is not web-safe`,
    `Event "${event}" is not available to web-authored pipelines`,
    `Trigger event "${event}" is not web-safe`,
  ]));
  registerPipelineJob({ name: job });
  registerPipelineEvent({ name: event });
  expect(pipelineCapabilityErrors(manifest, true)).toEqual([]);
});

test("availability reports unknown durable node and trigger events", () => {
  const errors = pipelineCapabilityErrors({
    start: "wait",
    edges: [],
    nodes: [{ id: "wait", kind: "event.wait", event: unique("missing") }],
    triggers: [{ id: "trigger", kind: "event", event: unique("missing-trigger") }],
  });
  expect(errors[0]).toContain("Unknown durable event");
  expect(errors[1]).toContain("Unknown durable trigger event");
});
