import { expect, test } from "bun:test";
import {
  evaluatePipelineExpression,
  evaluatePipelineValue,
} from "../src";
import { readReference } from "../src/runtime/evaluation-context";

const context = {
  input: { count: 2, text: "b", list: [1, 2], nil: null },
  trigger: {},
  nodes: {},
};

test("pipeline values preserve primitives, arrays, objects, and missing values", () => {
  expect(evaluatePipelineValue(undefined, context)).toBeUndefined();
  expect(evaluatePipelineValue(null, context)).toBeNull();
  expect(evaluatePipelineValue([1, { $ref: "input.count" }], context)).toEqual([1, 2]);
  expect(evaluatePipelineValue({ nested: { value: true } }, context)).toEqual({
    nested: { value: true },
  });
  expect(readReference(context, "input.count.value")).toBeUndefined();
  expect(readReference(context, "input.missing")).toBeUndefined();
  expect(readReference(context, "..input.count.")).toBe(2);
});

test("pipeline expressions cover every logical and comparison operator", () => {
  const ref = (name: string) => ({ $ref: `input.${name}` }) as const;
  expect(evaluatePipelineExpression({ op: "exists", value: ref("count") }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "exists", value: ref("missing") }, context)).toBe(false);
  expect(evaluatePipelineExpression({ op: "not", value: { op: "eq", left: 1, right: 2 } }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "and", values: [{ op: "eq", left: 1, right: 1 }] }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "or", values: [{ op: "eq", left: 1, right: 2 }] }, context)).toBe(false);
  expect(evaluatePipelineExpression({ op: "neq", left: 1, right: 2 }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "gt", left: ref("count"), right: 1 }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "gte", left: 2, right: 2 }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "lt", left: "a", right: ref("text") }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "lte", left: "b", right: "b" }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "in", left: 2, right: ref("list") }, context)).toBe(true);
  expect(evaluatePipelineExpression({ op: "in", left: 2, right: 2 }, context)).toBe(false);
  expect(evaluatePipelineExpression({ op: "gt", left: null, right: 1 }, context)).toBe(false);
  expect(evaluatePipelineExpression({ op: "invalid" } as never, context)).toBe(false);
});
