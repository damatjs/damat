import type { CommandOption } from "./commandOption";
import type { CliLogger } from "./io";

export interface CommandContext {
  command: string;
  args: string[];
  options: Record<string, unknown>;
  logger: CliLogger;
  cwd: string;
}

export interface CommandResult {
  exitCode: number;
}

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  examples?: string[];
  options?: CommandOption[];
  subcommands?: Command[];
  handler: (ctx: CommandContext) => Promise<CommandResult>;
}
