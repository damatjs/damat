import { afterEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  getPipelineDefinition,
} from "../src";

afterEach(clearPipelineRuntime);

test("defines an immutable, checksummed graph", () => {
  const definition = definePipeline("orders.fulfill", {
    version: 1,
    start: "reserve",
    nodes: [
      { id: "reserve", kind: "action", name: "reserve" },
      { id: "notify", kind: "event.publish", event: "orders.ready" },
    ],
    edges: [{ from: "reserve", to: "notify" }],
  });
  expect(definition.version).toBe("1");
  expect(definition.checksum).toHaveLength(64);
  expect(getPipelineDefinition("orders.fulfill")).toBe(definition);
  expect(() =>
    definePipeline("orders.fulfill", {
      version: 2,
      start: "only",
      nodes: [{ id: "only", kind: "fork" }],
      edges: [],
    }),
  ).toThrow("already defined");
});

test("requires explicit loop nodes instead of graph cycles", () => {
  expect(() =>
    definePipeline("cycle", {
      version: 1,
      start: "a",
      nodes: [
        { id: "a", kind: "fork" },
        { id: "b", kind: "fork" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ],
    }),
  ).toThrow("explicit loop node");
});

test("rejects unsafe value references and expression operators", () => {
  expect(() =>
    definePipeline("unsafe-ref", {
      version: 1,
      start: "only",
      edges: [],
      nodes: [
        {
          id: "only",
          kind: "action",
          name: "x",
          input: { value: { $ref: "input.__proto__.secret" } },
        },
      ],
    }),
  ).toThrow("invalid reference");
  expect(() =>
    definePipeline("unsafe-expression", {
      version: 1,
      start: "only",
      edges: [],
      nodes: [
        {
          id: "only",
          kind: "condition",
          expression: { op: "execute" } as never,
        },
      ],
    }),
  ).toThrow("unknown operator");
});
