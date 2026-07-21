import type { CAC } from "cac";
import type { CliDefinition, CliRuntime, Command } from "../types";
import { buildOptionFlag } from "./buildOption";
import { runCommand, type ProjectConfigAccessor } from "./runCommand";

export function registerSingleCommand(
  cli: CAC,
  command: Command,
  definition: CliDefinition,
  runtime: CliRuntime,
  project?: ProjectConfigAccessor,
): void {
  if (command.subcommands) return;
  const registered = cli.command(command.name, command.description);

  for (const alias of command.aliases ?? []) registered.alias(alias);
  for (const option of command.options ?? []) {
    registered.option(buildOptionFlag(option), option.description, {
      default: option.default,
    });
  }

  registered.action(async (parsed: Record<string, unknown>) => {
    const options = { ...parsed };
    delete options._;
    return runCommand(
      command,
      command.name,
      runtime.args.slice(1),
      options,
      definition,
      runtime,
      project,
    );
  });
}
