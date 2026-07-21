import { expect, test } from "bun:test";
import { validatePipelineNode } from "../src/definitions/validate-node";

test("node validation accepts complete retry and compensation input policies", () => {
  expect(() =>
    validatePipelineNode({
      id: "task",
      kind: "action",
      name: "run",
      retry: { maxAttempts: 2, backoffMs: 0, backoffMultiplier: 1 },
      compensateWith: {
        kind: "action",
        name: "undo",
        input: { id: { $ref: "input.id" } },
      },
    }),
  ).not.toThrow();
});

test("node validation rejects unsafe compensation input values", () => {
  expect(() =>
    validatePipelineNode({
      id: "task",
      kind: "action",
      name: "run",
      compensateWith: {
        kind: "action",
        name: "undo",
        input: { bad: undefined } as never,
      },
    }),
  ).toThrow("compensation.input.bad");
});
