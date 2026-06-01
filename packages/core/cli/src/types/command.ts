import type { ILogger } from "@damatjs/logger";
import type { CommandOption } from "./commandOption";

export interface CommandContext {
  command: string;
  args: string[];
  options: Record<string, unknown>;
  logger: ILogger;
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
