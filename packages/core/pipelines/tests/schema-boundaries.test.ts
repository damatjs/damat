import { expect, test } from "bun:test";
import { validatePipelineSchema } from "../src";

const invalid = (value: unknown, schema: Record<string, unknown>, text: string) =>
  expect(() => validatePipelineSchema(value, schema, "field")).toThrow(text);

test("schema validation handles absent, const, enum, and union types", () => {
  expect(() => validatePipelineSchema(Symbol("ignored"), undefined)).not.toThrow();
  invalid("a", { const: "b" }, "const");
  invalid("a", { enum: ["b", "c"] }, "allowed values");
  invalid(1, { type: ["string", "null"] }, "string or null");
  for (const [value, type] of [
    [null, "null"],
    [[], "array"],
    [{}, "object"],
    [1, "integer"],
    [true, "boolean"],
  ] as const)
    expect(() => validatePipelineSchema(value, { type })).not.toThrow();
});

test("string and number schemas enforce every scalar boundary", () => {
  invalid("a", { minLength: 2 }, "too short");
  invalid("long", { maxLength: 2 }, "too long");
  invalid("abc", { pattern: "^z" }, "invalid format");
  invalid(0, { minimum: 1 }, "below minimum");
  invalid(3, { maximum: 2 }, "above maximum");
});

test("array schemas enforce counts and validate each item", () => {
  invalid([], { minItems: 1 }, "too few");
  invalid([1, 2], { maxItems: 1 }, "too many");
  invalid([1, "bad"], { items: { type: "number" } }, "field[1]");
  expect(() => validatePipelineSchema([1], { items: false })).not.toThrow();
});

test("object schemas ignore malformed declarations but enforce real ones", () => {
  expect(() =>
    validatePipelineSchema({ ok: 1 }, { required: [4], properties: false }),
  ).not.toThrow();
  invalid({}, { required: ["id"] }, "field.id");
  invalid(
    { id: 1 },
    { properties: { id: { type: "string" } } },
    "field.id",
  );
});
