/**
 * Unknown Command
 *
 * Handle unknown commands.
 */

import { HELP_TEXT } from "./data";
import type { CommandResult } from "./types";

/**
 * Handle unknown command.
 */
export function commandUnknown(command: string): CommandResult {
  console.error(`\x1b[31mUnknown command: ${command}\x1b[0m`);
  console.log(HELP_TEXT);
  return { exitCode: 1 };
}
