import {
  failSchema,
  isSchemaObject,
  type PipelineSchema,
  type PipelineSchemaValidator,
} from "./schema-support";

export function validateCompositeSchema(
  value: unknown,
  schema: PipelineSchema,
  path: string,
  validate: PipelineSchemaValidator,
): void {
  if (Array.isArray(schema.allOf))
    for (const item of schema.allOf) {
      if (isSchemaObject(item)) validate(value, item, path);
    }
  for (const key of ["anyOf", "oneOf"] as const) {
    if (!Array.isArray(schema[key])) continue;
    const matches = schema[key].filter(
      (item) => isSchemaObject(item) && isValid(value, item, path, validate),
    ).length;
    if (key === "anyOf" ? matches < 1 : matches !== 1)
      failSchema(path, `does not satisfy ${key}`);
  }
  if (
    isSchemaObject(schema.not) &&
    isValid(value, schema.not, path, validate)
  ) {
    failSchema(path, "satisfies a forbidden schema");
  }
}

export function validateObjectSchema(
  value: Record<string, unknown>,
  schema: PipelineSchema,
  path: string,
  validate: PipelineSchemaValidator,
): void {
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required)
    if (typeof key === "string" && !(key in value))
      failSchema(`${path}.${key}`, "is required");
  const properties = isSchemaObject(schema.properties) ? schema.properties : {};
  for (const [key, child] of Object.entries(properties))
    if (key in value && isSchemaObject(child))
      validate(value[key], child, `${path}.${key}`);
  if (schema.additionalProperties === false)
    for (const key of Object.keys(value))
      if (!(key in properties)) failSchema(`${path}.${key}`, "is not allowed");
}

export function validateArraySchema(
  value: unknown[],
  schema: PipelineSchema,
  path: string,
  validate: PipelineSchemaValidator,
): void {
  if (typeof schema.minItems === "number" && value.length < schema.minItems)
    failSchema(path, "has too few items");
  if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
    failSchema(path, "has too many items");
  if (isSchemaObject(schema.items))
    value.forEach((item, index) =>
      validate(item, schema.items as PipelineSchema, `${path}[${index}]`),
    );
}

function isValid(
  value: unknown,
  schema: PipelineSchema,
  path: string,
  validate: PipelineSchemaValidator,
): boolean {
  try {
    validate(value, schema, path);
    return true;
  } catch {
    return false;
  }
}
