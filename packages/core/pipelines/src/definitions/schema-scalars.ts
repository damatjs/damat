import { failSchema, type PipelineSchema } from "./schema-support";

export function validateStringSchema(
  value: string,
  schema: PipelineSchema,
  path: string,
): void {
  if (typeof schema.minLength === "number" && value.length < schema.minLength)
    failSchema(path, "is too short");
  if (typeof schema.maxLength === "number" && value.length > schema.maxLength)
    failSchema(path, "is too long");
  if (
    typeof schema.pattern === "string" &&
    !new RegExp(schema.pattern).test(value)
  ) {
    failSchema(path, "has invalid format");
  }
}

export function validateNumberSchema(
  value: number,
  schema: PipelineSchema,
  path: string,
): void {
  if (typeof schema.minimum === "number" && value < schema.minimum)
    failSchema(path, "is below minimum");
  if (typeof schema.maximum === "number" && value > schema.maximum)
    failSchema(path, "is above maximum");
}
