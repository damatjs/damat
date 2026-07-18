import { afterEach, expect, test } from "bun:test";
import { defineDurableEvent } from "@damatjs/events";
import { defineJob } from "@damatjs/jobs";
import {
  clearPipelineRuntime,
  clearPipelineRuntimeBindings,
  configurePipelineDefaults,
  definePipeline,
  getPipelineDefinition,
  getPipelineRuntimeSupport,
  pipelineCapabilityErrors,
  validateOperationalLimits,
} from "../src";

afterEach(clearPipelineRuntime);

test("process shutdown clears bindings without erasing code definitions", () => {
  definePipeline("restart-safe", {
    version: 1,
    start: "only",
    nodes: [{ id: "only", kind: "delay", delayMs: 0 }],
    edges: [],
  });
  configurePipelineDefaults({ jobs: false, events: false });
  clearPipelineRuntimeBindings();
  expect(getPipelineDefinition("restart-safe")?.version).toBe("1");
  expect(getPipelineRuntimeSupport()).toEqual({ jobs: true, events: true });
});

test("enforces fanout and total activation ceilings", () => {
  const manifest = {
    start: "each",
    edges: [],
    nodes: [
      {
        id: "each",
        kind: "foreach" as const,
        pipeline: "child",
        items: [],
        maxItems: 20,
        concurrency: 2,
      },
    ],
  };
  expect(() => validateOperationalLimits(manifest, 100, 10)).toThrow(
    "maxFanOut",
  );
  expect(() => validateOperationalLimits(manifest, 10, 20)).toThrow(
    "maxNodeActivations",
  );
});

test("reports durable services required by referenced capabilities", () => {
  const job = `pipeline-job-${crypto.randomUUID()}`;
  defineJob(job, async () => null);
  configurePipelineDefaults({ jobs: false, events: false });
  const errors = pipelineCapabilityErrors({
    start: "job",
    nodes: [{ id: "job", kind: "job", name: job }],
    edges: [],
  });
  expect(errors).toContain("Job nodes require services.jobs");

  const published = `pipeline-event-${crypto.randomUUID()}`;
  const triggered = `pipeline-trigger-${crypto.randomUUID()}`;
  defineDurableEvent(published);
  defineDurableEvent(triggered);
  const eventErrors = pipelineCapabilityErrors({
    start: "publish",
    nodes: [{ id: "publish", kind: "event.publish", event: published }],
    edges: [],
    triggers: [{ id: "on-order", kind: "event", event: triggered }],
  });
  expect(eventErrors).toContain("Event nodes require services.events.durable");
  expect(eventErrors).toContain(
    "Event triggers require services.events.durable",
  );
});
