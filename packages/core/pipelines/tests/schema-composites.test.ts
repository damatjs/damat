import { expect, test } from "bun:test";
import { validatePipelineSchema } from "../src";

test("composite schemas count valid anyOf and oneOf alternatives", () => {
  expect(() =>
    validatePipelineSchema("yes", {
      anyOf: [false, { type: "number" }, { type: "string" }],
    }),
  ).not.toThrow();
  expect(() =>
    validatePipelineSchema(true, { anyOf: [{ type: "number" }] }),
  ).toThrow("anyOf");
  expect(() =>
    validatePipelineSchema(1, {
      oneOf: [{ type: "number" }, { type: "integer" }],
    }),
  ).toThrow("oneOf");
  expect(() =>
    validatePipelineSchema("one", {
      oneOf: [{ type: "string" }, { type: "number" }],
    }),
  ).not.toThrow();
});

test("allOf ignores non-schema entries and forbidden schemas are enforced", () => {
  expect(() =>
    validatePipelineSchema(2, {
      allOf: [false, { type: "integer" }, { minimum: 1 }],
      not: { const: 3 },
    }),
  ).not.toThrow();
  expect(() => validatePipelineSchema(3, { not: { const: 3 } })).toThrow(
    "forbidden schema",
  );
  expect(() => validatePipelineSchema(3, { not: false })).not.toThrow();
});
