import type { Command } from "../types";

export function formatCommandLine(cmd: Command): string {
  let line = `  ${cmd.name.padEnd(20)}${cmd.description}`;

  if (cmd.aliases && cmd.aliases.length > 0) {
    line += ` (aliases: ${cmd.aliases.join(", ")})`;
  }

  return line;
}
