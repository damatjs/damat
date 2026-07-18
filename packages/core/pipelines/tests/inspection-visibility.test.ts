import { expect, test } from "bun:test";
import type { PipelineManifest } from "../src";
import { inspectionOptionsForManifest } from "../src/inspection/config";
import { visibleManifest, visibleTransitions } from "../src/inspection/manifest";
import { visibleNode, visibleRun } from "../src/inspection/visibility";

const options = (visibility: "full" | "metadata" | "hidden") => ({
  visibility,
  redaction: { keys: ["secret"] },
  cursorSigningKey: "test-signing-key-with-at-least-32-bytes",
  client: {} as never,
});
const now = new Date();

test("full and hidden manifests expose the intended authoring fields", () => {
  const manifest: PipelineManifest = {
    start: "wait",
    nodes: [{ id: "wait", kind: "signal.wait", signal: "go", input: { secret: 1 } }],
    edges: [],
    triggers: [{ id: "tick", kind: "interval", everyMs: 10, input: { secret: 1 } }],
    inspection: { visibility: "hidden" },
  };
  expect(visibleManifest(manifest, options("full"))).toMatchObject({ start: "wait" });
  const hidden = visibleManifest(manifest, options("hidden"));
  expect(hidden.nodes).toEqual([{ id: "wait", kind: "signal.wait", signal: "go" }]);
  expect(hidden.triggers).toEqual([{ id: "tick", kind: "interval", everyMs: 10 }]);
  expect(inspectionOptionsForManifest(options("full"), manifest).visibility).toBe("hidden");
  expect(
    inspectionOptionsForManifest(options("metadata"), { ...manifest, inspection: undefined }).visibility,
  ).toBe("metadata");
});

test("transition visibility redacts full records and strips hidden edge values", () => {
  const rows = [{
    id: "t", from_execution_id: null, to_execution_id: null,
    edge: { from: "a", to: "b", input: { secret: 1 } }, reason: "test", created_at: now,
  }];
  expect(visibleTransitions(rows, options("full"))[0]).toBeDefined();
  expect(visibleTransitions(rows, options("hidden"))).toEqual([{ ...rows[0], edge: { from: "a", to: "b" } }]);
});

test("run and node visibility handles values, metadata, and errors", () => {
  const run = {
    id: "r", definitionId: "d", versionId: "v", name: "p", version: "1",
    status: "failed" as const, input: { secret: 1 }, output: { secret: 2 },
    error: { name: "Boom", secret: 3 }, metadata: { secret: 4 }, trigger: { secret: 5 },
    createdAt: now, updatedAt: now,
  };
  expect(visibleRun(run, options("full"))).toMatchObject({
    input: { secret: "[REDACTED]" },
    output: { secret: "[REDACTED]" },
    error: { name: "Boom", secret: "[REDACTED]" },
  });
  expect(visibleRun(run, options("hidden"))).toMatchObject({ metadata: {}, trigger: {}, error: { name: "Boom" } });
  const node = {
    id: "n", runId: "r", nodeId: "x", activationKey: "main", phase: "forward" as const,
    kind: "action", status: "failed" as const, input: { secret: 1 }, output: { secret: 2 },
    error: { secret: 3 }, availableAt: now, createdAt: now, updatedAt: now,
  };
  expect(visibleNode(node, options("full"))).toMatchObject({
    input: { secret: "[REDACTED]" },
    output: { secret: "[REDACTED]" },
    error: { secret: "[REDACTED]" },
  });
  expect(visibleNode(node, options("metadata"))).not.toHaveProperty("input");
  expect(visibleNode(node, options("hidden")).error).toEqual({});
});
