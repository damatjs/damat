import type { InstallMapping, InstallMode, UsageHint } from "../types/recipe";
import {
  assertRecord,
  optionalString,
  rejectUnknownKeys,
  requiredString,
} from "./assert";
import { requiredArray, stringArray, stringRecord } from "./collections";
import { parseInstallMode } from "./mode";
import { assertSafeRelativePath } from "./path";

export function parseInstall(value: unknown): {
  modes: InstallMode[];
  default?: InstallMode;
} {
  const record = assertRecord(value, "install");
  rejectUnknownKeys(record, ["modes", "default"]);
  const modes = requiredArray(record, "modes").map((mode) =>
    parseInstallMode(mode),
  );
  if (modes.length === 0 || new Set(modes).size !== modes.length)
    throw new TypeError("modes must be non-empty and unique");
  const fallback =
    record.default === undefined
      ? undefined
      : parseInstallMode(record.default, "default");
  if (fallback && !modes.includes(fallback))
    throw new TypeError("default must be included in modes");
  return { modes, ...(fallback && { default: fallback }) };
}

export function parseMappings(value: unknown): InstallMapping[] {
  if (!Array.isArray(value)) throw new TypeError("mappings must be an array");
  return value.map((item) => {
    const record = assertRecord(item, "mapping");
    rejectUnknownKeys(record, ["from", "to"]);
    return {
      from: requiredString(record, "from"),
      to: assertSafeRelativePath(requiredString(record, "to"), "to"),
    };
  });
}

export function parsePackage(value: unknown): { name: string; ref?: string } {
  const record = assertRecord(value, "package");
  rejectUnknownKeys(record, ["name", "ref"]);
  const ref = optionalString(record, "ref");
  return { name: requiredString(record, "name"), ...(ref && { ref }) };
}

export function parseUsageHints(value: unknown): UsageHint[] {
  if (!Array.isArray(value)) throw new TypeError("usageHints must be an array");
  return value.map((item) => {
    const record = assertRecord(item, "usageHint");
    rejectUnknownKeys(record, ["token", "targets"]);
    const targets =
      record.targets === undefined
        ? undefined
        : stringArray(record.targets, "targets");
    targets?.forEach((target) => assertSafeRelativePath(target, "targets"));
    return {
      token: requiredString(record, "token"),
      ...(targets && { targets }),
    };
  });
}

export { stringArray, stringRecord };
