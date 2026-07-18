import {
  failSchema,
  isSchemaObject,
  matchesSchemaType,
  sameSchemaValue,
  type PipelineSchema,
} from "./schema-support";
import {
  validateArraySchema,
  validateCompositeSchema,
  validateObjectSchema,
} from "./schema-structure";
import { validateNumberSchema, validateStringSchema } from "./schema-scalars";

export { PipelineSchemaValidationError } from "./schema-support";

export function validatePipelineSchema(
  value: unknown,
  schema: PipelineSchema | undefined,
  path = "value",
): void {
  if (!schema) return;
  validateCompositeSchema(value, schema, path, validatePipelineSchema);
  if ("const" in schema && !sameSchemaValue(value, schema.const))
    failSchema(path, "does not match const");
  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((item) => sameSchemaValue(item, value))
  ) {
    failSchema(path, "is not one of the allowed values");
  }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (
    schema.type !== undefined &&
    !types.some((type) => matchesSchemaType(value, type))
  ) {
    failSchema(path, `must be ${types.join(" or ")}`);
  }
  if (Array.isArray(value))
    validateArraySchema(value, schema, path, validatePipelineSchema);
  else if (isSchemaObject(value))
    validateObjectSchema(value, schema, path, validatePipelineSchema);
  else if (typeof value === "string") validateStringSchema(value, schema, path);
  else if (typeof value === "number") validateNumberSchema(value, schema, path);
}
