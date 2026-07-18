import { expect, test } from "bun:test";
import {
  validatePipelineExpression,
  validatePipelineValue,
} from "../src";

test("pipeline values accept JSON data and safe closed references", () => {
  for (const value of [null, "text", true, 2, [1, "two"], { nested: false }])
    expect(() => validatePipelineValue(value, "value")).not.toThrow();
  for (const root of [
    "input",
    "trigger",
    "nodes",
    "signal",
    "event",
    "item",
    "iteration",
  ]) {
    expect(() =>
      validatePipelineValue({ $ref: `${root}.value` }, "value"),
    ).not.toThrow();
  }
});

test("pipeline values reject non-JSON and unsafe reference shapes", () => {
  expect(() => validatePipelineValue(Infinity, "value")).toThrow("finite");
  expect(() => validatePipelineValue(undefined, "value")).toThrow("JSON");
  expect(() =>
    validatePipelineValue({ $ref: "input.id", extra: true }, "value"),
  ).toThrow("contain only");
  for (const reference of ["", "unknown.id", "input..id", "input.constructor"])
    expect(() => validatePipelineValue({ $ref: reference }, "value")).toThrow(
      "invalid reference",
    );
  const unsafe = Object.create(null) as Record<string, unknown>;
  unsafe.prototype = true;
  expect(() => validatePipelineValue(unsafe, "value")).toThrow("forbidden");
});

test("expressions validate unary, logical, and comparison operators", () => {
  const expressions = [
    { op: "exists", value: { $ref: "input.id" } },
    { op: "not", value: { op: "exists", value: null } },
    { op: "or", values: [{ op: "eq", left: 1, right: 2 }] },
    { op: "neq", left: 1, right: 2 },
    { op: "in", left: 1, right: [1, 2] },
  ];
  for (const expression of expressions)
    expect(() =>
      validatePipelineExpression(expression, "expression"),
    ).not.toThrow();
});

test("expressions reject malformed and incomplete operands", () => {
  expect(() => validatePipelineExpression(null, "expression")).toThrow(
    "pipeline expression",
  );
  expect(() =>
    validatePipelineExpression({ op: "exists", value: 1, extra: 2 }, "x"),
  ).toThrow("invalid expression fields");
  expect(() =>
    validatePipelineExpression({ op: "not", value: 1 }, "x"),
  ).toThrow("pipeline expression");
  expect(() =>
    validatePipelineExpression({ op: "and", values: [] }, "x"),
  ).toThrow("at least one");
  expect(() =>
    validatePipelineExpression({ op: "eq", left: 1 }, "x"),
  ).toThrow("invalid expression fields");
});
