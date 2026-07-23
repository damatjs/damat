import type { CliDefinition } from "../types";

export interface ParsedGlobalOptions {
  args: string[];
  options: Record<string, unknown>;
}

export function consumeGlobalOptions(
  args: readonly string[],
  definition: CliDefinition,
): ParsedGlobalOptions {
  if (definition.verbose?.enabled !== true) {
    return { args: [...args], options: {} };
  }
  const remaining: string[] = [];
  let verbose: boolean | undefined;
  for (const argument of args) {
    if (argument === "--verbose") {
      verbose = true;
      continue;
    }
    if (argument === "--no-verbose") {
      verbose = false;
      continue;
    }
    if (argument.startsWith("--verbose=")) {
      verbose = argument.slice("--verbose=".length) !== "false";
      continue;
    }
    remaining.push(argument);
  }
  return {
    args: remaining,
    options: verbose === undefined ? {} : { verbose },
  };
}
