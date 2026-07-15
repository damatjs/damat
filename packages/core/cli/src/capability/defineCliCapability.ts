import type { CliCapability } from "../types";

export function defineCliCapability<const T extends CliCapability>(
  capability: T,
): T {
  return capability;
}
