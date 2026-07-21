import { expect, test } from "bun:test";
import type { PipelineManifest } from "../src";
import { visibleManifest } from "../src/inspection/manifest";

const manifest: PipelineManifest = {
  start: "decide",
  nodes: [
    {
      id: "decide",
      kind: "condition",
      expression: {
        op: "eq",
        left: { $ref: "input.secret" },
        right: "private",
      },
    },
    { id: "run", kind: "action", name: "safe", input: { token: "private" } },
  ],
  edges: [{ from: "decide", to: "run", input: { token: "private" } }],
  output: { $ref: "nodes.run.output" },
  inspection: { visibility: "hidden" },
};

test("hidden inspection preserves graph shape without value expressions", () => {
  const visible = visibleManifest(manifest, {
    visibility: "hidden",
    redaction: {},
    cursorSigningKey: "test",
    client: {} as never,
  });
  expect(visible.start).toBe("decide");
  expect(visible.output).toBeUndefined();
  expect(visible.nodes).toEqual([
    { id: "decide", kind: "condition" },
    { id: "run", kind: "action", name: "safe" },
  ]);
  expect(visible.edges).toEqual([{ from: "decide", to: "run" }]);
});
