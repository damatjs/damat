import { afterEach, expect, test } from "bun:test";
import { defineDurableEvent } from "@damatjs/events";
import { defineJob } from "@damatjs/jobs";
import {
  clearPipelineRuntime,
  configurePipelineDefaults,
  pipelineCapabilityErrors,
  registerPipelineEvent,
  registerPipelineJob,
} from "../src";

afterEach(clearPipelineRuntime);
const unique = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

test("availability enforces service support and web-safe catalogs", () => {
  const job = unique("job");
  const event = unique("event");
  defineJob(job, async () => null);
  defineDurableEvent(event);
  const manifest = {
    start: "job",
    edges: [],
    nodes: [
      {
        id: "job",
        kind: "job" as const,
        name: job,
        compensateWith: { kind: "job" as const, name: job },
      },
      { id: "publish", kind: "event.publish" as const, event },
    ],
    triggers: [{ id: "trigger", kind: "event" as const, event }],
  };
  configurePipelineDefaults({ jobs: false, events: false });
  expect(pipelineCapabilityErrors(manifest)).toEqual(
    expect.arrayContaining([
      "Job nodes require services.jobs",
      "Compensation job nodes require services.jobs",
      "Event nodes require services.events.durable",
      "Event triggers require services.events.durable",
    ]),
  );
  configurePipelineDefaults({ jobs: true, events: true });
  expect(pipelineCapabilityErrors(manifest, true)).toEqual(
    expect.arrayContaining([
      `Job "${job}" is not available to web-authored pipelines`,
      `Compensation job "${job}" is not web-safe`,
      `Event "${event}" is not available to web-authored pipelines`,
      `Trigger event "${event}" is not web-safe`,
    ]),
  );
  registerPipelineJob({ name: job });
  registerPipelineEvent({ name: event });
  expect(pipelineCapabilityErrors(manifest, true)).toEqual([]);
});
