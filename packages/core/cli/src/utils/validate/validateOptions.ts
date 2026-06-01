import type { CommandOption } from "../../types";
import { MissingRequiredOptionError } from "../../errors";

export function validateOptions(
  options: Record<string, unknown>,
  optionDefs: CommandOption[] | undefined,
  commandName: string
): void {
  if (!optionDefs) return;

  for (const optDef of optionDefs) {
    if (optDef.required) {
      const value = options[optDef.name];
      const hasValue = value !== undefined && value !== null;

      if (!hasValue && optDef.default === undefined) {
        throw new MissingRequiredOptionError(optDef.name, commandName);
      }
    }
  }
}
