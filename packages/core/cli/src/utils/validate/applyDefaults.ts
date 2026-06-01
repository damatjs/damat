import type { CommandOption } from "../../types";

export function applyDefaults(
  options: Record<string, unknown>,
  optionDefs: CommandOption[] | undefined
): Record<string, unknown> {
  if (!optionDefs) return options;

  const result = { ...options };

  for (const optDef of optionDefs) {
    if (result[optDef.name] === undefined && optDef.default !== undefined) {
      result[optDef.name] = optDef.default;
    }
  }

  return result;
}
