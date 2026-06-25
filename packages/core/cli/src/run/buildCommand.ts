import { Logger } from "@damatjs/logger";
import type { CliConfig, CommandContext, CommandOption } from "../types";

/**
 * Parse raw argv tokens against a command's option definitions.
 * Supports --name value, --name=value, -a value, boolean flags, and
 * `--no-name` negation of boolean flags (mirrors cac's top-level parsing).
 * Defaults from the option definitions are applied first.
 */
export function parseCommandArgs(
  args: string[],
  optionDefs: CommandOption[] = [],
): { options: Record<string, unknown>; positional: string[] } {
  const options: Record<string, unknown> = {};
  const positional: string[] = [];

  for (const def of optionDefs) {
    if (def.default !== undefined) {
      options[def.name] = def.default;
    }
  }

  const findDef = (token: string): CommandOption | undefined => {
    const isLong = token.startsWith("--");
    const name = token.replace(/^--?/, "");
    return optionDefs.find((d) => (isLong ? d.name === name : d.alias === name));
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg.startsWith("-")) {
      let token = arg;
      let inlineValue: string | undefined;
      const eqIndex = arg.indexOf("=");
      if (eqIndex !== -1) {
        token = arg.slice(0, eqIndex);
        inlineValue = arg.slice(eqIndex + 1);
      }

      // `--no-<name>` negates a boolean option.
      if (token.startsWith("--no-")) {
        const negated = optionDefs.find(
          (d) => d.type === "boolean" && d.name === token.slice(5),
        );
        if (negated) {
          options[negated.name] = false;
          continue;
        }
      }

      const def = findDef(token);
      if (!def) continue; // unknown flag — ignore rather than fail

      if (def.type === "boolean") {
        options[def.name] = inlineValue !== undefined ? inlineValue !== "false" : true;
      } else {
        const value = inlineValue ?? args[++i];
        if (value === undefined) continue;
        options[def.name] = def.type === "number" ? Number(value) : value;
      }
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

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
