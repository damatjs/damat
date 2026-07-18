import { expect, test } from "bun:test";
import { validatePipelineManifest } from "../src";

const manifest = (node: Record<string, unknown>) => ({
  start: "node",
  nodes: [{ id: "node", ...node }],
  edges: [],
});
const invalid = (node: Record<string, unknown>, message: string) =>
  expect(() => validatePipelineManifest(manifest(node) as never)).toThrow(
    message,
  );

test("node identity validation rejects invalid identifiers and references", () => {
  invalid({ kind: "unknown" }, "Unknown pipeline node kind");
  invalid({ id: "bad.id", kind: "fork" }, "cannot contain dots");
  invalid({ kind: "action", name: "" }, "requires a name");
  invalid({ kind: "event.wait", event: "" }, "requires an event");
  invalid({ kind: "signal.wait", signal: "" }, "requires a signal");
  invalid({ kind: "child", pipeline: "" }, "requires a child pipeline");
  invalid({ kind: "condition" }, "requires an expression");
});

test("node policies reject unsafe timing, retries, and compensation", () => {
  invalid({ kind: "delay", delayMs: -1 }, "non-negative delayMs");
  invalid({ kind: "loop", pipeline: "p", maxIterations: 0 }, "maxIterations");
  invalid({ kind: "foreach", pipeline: "p", items: [], maxItems: 0 }, "maxItems");
  invalid({ kind: "join", join: "some" }, "invalid policy");
  invalid({ kind: "fork", failure: "ignore" }, "invalid failure policy");
  invalid(
    { kind: "fork", compensateWith: { kind: "delay", name: "x" } },
    "invalid compensation task",
  );
  invalid({ kind: "fork", retry: { maxAttempts: 0 } }, "maxAttempts");
  invalid({ kind: "fork", retry: { backoffMs: -1 } }, "backoffMs");
  invalid({ kind: "fork", retry: { backoffMultiplier: 0 } }, "backoffMultiplier");
});

test("manifest policies reject invalid graph and retention settings", () => {
  expect(() =>
    validatePipelineManifest({ start: "none", nodes: [], edges: [] }),
  ).toThrow("at least one node");
  expect(() =>
    validatePipelineManifest({
      start: "a",
      nodes: [
        { id: "a", kind: "fork" },
        { id: "a", kind: "fork" },
      ],
      edges: [],
    }),
  ).toThrow("Duplicate pipeline node");
  expect(() =>
    validatePipelineManifest({
      start: "missing",
      nodes: [{ id: "a", kind: "fork" }],
      edges: [],
    }),
  ).toThrow("Unknown pipeline start node");
  expect(() =>
    validatePipelineManifest({
      start: "a",
      nodes: [
        { id: "a", kind: "fork" },
        { id: "b", kind: "fork" },
      ],
      edges: [],
    }),
  ).toThrow("Unreachable pipeline nodes");
  expect(() =>
    validatePipelineManifest({
      ...manifest({ kind: "fork" }),
      retentionMs: -1,
    } as never),
  ).toThrow("retentionMs");
  expect(() =>
    validatePipelineManifest({
      ...manifest({ kind: "fork" }),
      inspection: { visibility: "secret" },
    } as never),
  ).toThrow("visibility");
});
