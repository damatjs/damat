/**
 * Help Command
 *
 * Show help text for the CLI.
 */

import { HELP_TEXT } from "./data";
import type { CommandResult } from "./types";

/**
 * Show help text.
 */
export function commandHelp(): CommandResult {
  console.log(HELP_TEXT);
  return { exitCode: 0 };
}
