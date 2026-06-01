import { Logger } from "@damatjs/logger";
import type { CliConfig, CommandContext } from "../types";

export function buildCommandContext(
  commandName: string,
  options: Record<string, unknown>,
  logger: Logger,
  config: CliConfig
): CommandContext {
  const positionalArgs = extractPositionalArgs(process.argv.slice(2).filter(a => a !== commandName));

  return {
    command: commandName,
    args: positionalArgs,
    options,
    logger,
    cwd: process.cwd(),
  };
}

export function extractPositionalArgs(args: string[]): string[] {
  const positionalArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg.startsWith("-") || arg.startsWith("--")) {
      i++;
      continue;
    }
    positionalArgs.push(arg);
  }
  return positionalArgs;
}
