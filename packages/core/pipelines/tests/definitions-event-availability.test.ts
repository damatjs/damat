import { afterEach, expect, test } from "bun:test";
import { clearPipelineRuntime, pipelineCapabilityErrors } from "../src";

afterEach(clearPipelineRuntime);
const unique = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

test("availability reports unknown durable node and trigger events", () => {
  const errors = pipelineCapabilityErrors({
    start: "wait",
    edges: [],
    nodes: [{ id: "wait", kind: "event.wait", event: unique("missing") }],
    triggers: [
      { id: "trigger", kind: "event", event: unique("missing-trigger") },
    ],
  });
  expect(errors[0]).toContain("Unknown durable event");
  expect(errors[1]).toContain("Unknown durable trigger event");
});
