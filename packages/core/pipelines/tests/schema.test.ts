import { expect, test } from "bun:test";
import { PipelineSchemaValidationError, validatePipelineSchema } from "../src";

const schema = {
  type: "object",
  required: ["id", "lines"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    lines: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["quantity"],
        properties: { quantity: { type: "integer", minimum: 1 } },
      },
    },
  },
};

test("validates JSON schema boundaries used by pipelines and capabilities", () => {
  expect(() =>
    validatePipelineSchema(
      { id: "order-1", lines: [{ quantity: 2 }] },
      schema,
      "order.input",
    ),
  ).not.toThrow();
  expect(() =>
    validatePipelineSchema(
      { id: "order-1", lines: [{ quantity: 0 }] },
      schema,
      "order.input",
    ),
  ).toThrow("order.input.lines[0].quantity");
  expect(() =>
    validatePipelineSchema(
      { id: "order-1", lines: [{ quantity: 1 }], secret: true },
      schema,
    ),
  ).toThrow("secret");
});

test("supports enum and composite schemas", () => {
  expect(() =>
    validatePipelineSchema("ready", { enum: ["ready", "done"] }),
  ).not.toThrow();
  expect(() =>
    validatePipelineSchema(3, {
      allOf: [{ type: "integer" }, { minimum: 1 }],
      not: { const: 4 },
    }),
  ).not.toThrow();
  expect(() => validatePipelineSchema(4, { not: { const: 4 } })).toThrow(
    PipelineSchemaValidationError,
  );
});
