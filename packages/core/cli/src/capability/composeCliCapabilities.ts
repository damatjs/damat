import type { CliCapability, Command } from "../types";

export function composeCliCapabilities(
  capabilities: readonly CliCapability[],
): Command[] {
  return capabilities.flatMap((capability) => [...capability.commands]);
}
