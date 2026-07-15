import type { InstallMode } from "../types/recipe";

export function parseInstallMode(value: unknown, name = "mode"): InstallMode {
  if (value !== "source" && value !== "package")
    throw new TypeError(`${name} is not a supported mode`);
  return value;
}
