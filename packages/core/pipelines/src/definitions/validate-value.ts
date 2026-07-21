const roots = new Set([
  "input",
  "trigger",
  "nodes",
  "signal",
  "event",
  "item",
  "iteration",
]);
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
const comparisons = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in"]);

export function validatePipelineValue(value: unknown, path: string): void {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error(`${path} must contain finite numbers`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validatePipelineValue(entry, `${path}[${index}]`),
    );
    return;
  }
  if (!isRecord(value))
    throw new Error(`${path} must be a JSON pipeline value`);
  if ("$ref" in value) {
    if (Object.keys(value).length !== 1 || typeof value.$ref !== "string") {
      throw new Error(`${path} reference must contain only a string $ref`);
    }
    validateReference(value.$ref, path);
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (forbidden.has(key))
      throw new Error(`${path} contains forbidden key "${key}"`);
    validatePipelineValue(entry, `${path}.${key}`);
  }
}

export function validatePipelineExpression(value: unknown, path: string): void {
  if (!isRecord(value) || typeof value.op !== "string") {
    throw new Error(`${path} must be a pipeline expression`);
  }
  if (value.op === "exists") {
    exact(value, ["op", "value"], path);
    validatePipelineValue(value.value, `${path}.value`);
    return;
  }
  if (value.op === "not") {
    exact(value, ["op", "value"], path);
    validatePipelineExpression(value.value, `${path}.value`);
    return;
  }
  if (value.op === "and" || value.op === "or") {
    exact(value, ["op", "values"], path);
    if (!Array.isArray(value.values) || !value.values.length) {
      throw new Error(`${path}.${value.op} requires at least one expression`);
    }
    value.values.forEach((entry, index) =>
      validatePipelineExpression(entry, `${path}.values[${index}]`),
    );
    return;
  }
  if (!comparisons.has(value.op))
    throw new Error(`${path} has unknown operator "${value.op}"`);
  exact(value, ["op", "left", "right"], path);
  validatePipelineValue(value.left, `${path}.left`);
  validatePipelineValue(value.right, `${path}.right`);
}

function validateReference(reference: string, path: string): void {
  const segments = reference.split(".");
  if (
    !reference ||
    segments.some((entry) => !entry || forbidden.has(entry)) ||
    !roots.has(segments[0]!)
  ) {
    throw new Error(`${path} has invalid reference "${reference}"`);
  }
}

function exact(
  value: Record<string, unknown>,
  keys: string[],
  path: string,
): void {
  if (
    Object.keys(value).some((key) => !keys.includes(key)) ||
    keys.some((key) => !(key in value))
  ) {
    throw new Error(`${path} has invalid expression fields`);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
