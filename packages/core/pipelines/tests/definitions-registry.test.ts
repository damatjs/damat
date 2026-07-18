import { afterEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  configurePipelineDefaults,
  definePipeline,
  getAllPipelineDefinitions,
  getPipelineDefaultRetention,
  getPipelineRuntimeSupport,
} from "../src";
import { pipelineChecksum, stableJson } from "../src/definitions/stable";

afterEach(clearPipelineRuntime);

test("definition registry rejects blank names and can be reset", () => {
  expect(() =>
    definePipeline(" ", {
      version: 1,
      start: "only",
      nodes: [{ id: "only", kind: "delay", delayMs: 0 }],
      edges: [],
    }),
  ).toThrow("name is required");
  definePipeline("registered", {
    version: "2",
    start: "only",
    nodes: [{ id: "only", kind: "delay", delayMs: 0 }],
    edges: [],
  });
  expect(getAllPipelineDefinitions().map(({ name }) => name)).toEqual([
    "registered",
  ]);
  clearPipelineRuntime();
  expect(getAllPipelineDefinitions()).toEqual([]);
});

test("stable serialization sorts objects recursively but keeps arrays", () => {
  const left = { z: [{ b: 2, a: 1 }], a: null };
  const right = { a: null, z: [{ a: 1, b: 2 }] };
  expect(stableJson(left)).toBe(stableJson(right));
  expect(pipelineChecksum(left)).toBe(pipelineChecksum(right));
  expect(stableJson([2, 1])).toBe("[2,1]");
});

test("runtime defaults validate retention and expose support", () => {
  expect(getPipelineDefaultRetention()).toBe(90 * 24 * 60 * 60 * 1_000);
  expect(getPipelineRuntimeSupport()).toEqual({ jobs: true, events: true });
  expect(() => configurePipelineDefaults({ retentionMs: -1 })).toThrow(
    "nonnegative safe integer",
  );
  configurePipelineDefaults({
    retentionMs: "forever",
    jobs: false,
    events: false,
  });
  expect(getPipelineDefaultRetention()).toBe("forever");
  expect(getPipelineRuntimeSupport()).toEqual({ jobs: false, events: false });
});
