export type PipelineSchema = Record<string, unknown>;
export type PipelineSchemaValidator = (
  value: unknown,
  schema: PipelineSchema | undefined,
  path?: string,
) => void;

export class PipelineSchemaValidationError extends Error {
  constructor(
    public readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "PipelineSchemaValidationError";
  }
}

export const isSchemaObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const sameSchemaValue = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

export const failSchema = (path: string, message: string): never => {
  throw new PipelineSchemaValidationError(path, message);
};

export const matchesSchemaType = (value: unknown, type: unknown) =>
  type === "null"
    ? value === null
    : type === "array"
      ? Array.isArray(value)
      : type === "object"
        ? isSchemaObject(value)
        : type === "integer"
          ? Number.isInteger(value)
          : typeof value === type;
