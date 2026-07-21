import { expect, test } from "bun:test";
import { validateOperationalLimits, validatePipelineManifest } from "../src";

const graph = (edges: unknown[]) => ({
  start: "a",
  nodes: [
    { id: "a", kind: "fork" as const },
    { id: "b", kind: "fork" as const },
  ],
  edges,
});

test("edges require known endpoints, unique pairs, and valid policies", () => {
  expect(() =>
    validatePipelineManifest(graph([{ from: "a", to: "missing" }]) as never),
  ).toThrow("unknown node");
  expect(() =>
    validatePipelineManifest(
      graph([
        { from: "a", to: "b" },
        { from: "a", to: "b" },
      ]) as never,
    ),
  ).toThrow("Duplicate pipeline edge");
  expect(() =>
    validatePipelineManifest(
      graph([{ from: "a", to: "b", on: "later" }]) as never,
    ),
  ).toThrow("invalid outcome");
  expect(() =>
    validatePipelineManifest(
      graph([{ from: "a", to: "b", input: Infinity }]) as never,
    ),
  ).toThrow("finite");
  expect(() =>
    validatePipelineManifest(
      graph([{ from: "a", to: "b", when: {} }]) as never,
    ),
  ).toThrow("pipeline expression");
});

const triggered = (trigger: Record<string, unknown>) => ({
  start: "a",
  nodes: [{ id: "a", kind: "fork" as const }],
  edges: [],
  triggers: [trigger],
});

test("triggers validate kind, identity, schedules, events, and input", () => {
  for (const [trigger, error] of [
    [{ id: "x", kind: "other" }, "Unknown pipeline trigger"],
    [{ id: "", kind: "interval", everyMs: 1 }, "unique and non-empty"],
    [{ id: "x", kind: "interval", everyMs: 0 }, "interval trigger"],
    [{ id: "x", kind: "cron", expression: "* *" }, "five UTC fields"],
    [{ id: "x", kind: "event", event: "" }, "requires an event"],
    [{ id: "x", kind: "interval", everyMs: 1, input: Infinity }, "finite"],
  ] as const) {
    expect(() => validatePipelineManifest(triggered(trigger) as never)).toThrow(
      error,
    );
  }
  const valid = {
    ...triggered({ id: "one", kind: "interval", everyMs: 1 }),
    triggers: [
      { id: "one", kind: "interval", everyMs: 1 },
      { id: "two", kind: "cron", expression: "* * * * *" },
      { id: "three", kind: "event", event: "orders.created" },
    ],
  };
  expect(() => validatePipelineManifest(valid as never)).not.toThrow();
});

test("operational limits validate foreach concurrency and loop expansion", () => {
  const manifest = {
    start: "each",
    edges: [],
    nodes: [
      {
        id: "each",
        kind: "foreach",
        pipeline: "child",
        items: [],
        maxItems: 2,
        concurrency: 3,
      },
    ],
  } as never;
  expect(() => validateOperationalLimits(manifest)).toThrow("concurrency");
});
