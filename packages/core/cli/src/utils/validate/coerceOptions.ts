import type { CommandOption } from "../../types";

export function coerceOptionValue(
  value: unknown,
  type: CommandOption["type"]
): unknown {
  if (value === undefined || value === null) return value;

  switch (type) {
    case "number": {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    case "boolean":
      return Boolean(value);
    case "string":
    default:
      return String(value);
  }
}

export function coerceOptions(
  options: Record<string, unknown>,
  optionDefs: CommandOption[] | undefined
): Record<string, unknown> {
  if (!optionDefs) return options;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(options)) {
    const optDef = optionDefs.find((o) => o.name === key || o.alias === key);
    const type = optDef?.type;
    result[key] = coerceOptionValue(value, type);
  }

  return result;
}
