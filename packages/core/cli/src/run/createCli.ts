import { cac, type CAC } from "cac";
import type { CliDefinition, CliRuntime, CommandRegistry } from "../types";
import { handleHelpCommand } from "./helpCommand";
import { registerSingleCommand } from "./registerCommand";
import type { ProjectConfigAccessor } from "./runCommand";

export function createCli(
  definition: CliDefinition,
  runtime: CliRuntime,
  registry: CommandRegistry,
  project?: ProjectConfigAccessor,
): CAC {
  const cli = cac(definition.name);
  cli.version(definition.version);
  cli.help();
  if (definition.verbose?.enabled === true) {
    cli.option("--verbose", "Enable verbose output");
  }
  handleHelpCommand(cli, definition, runtime, registry);
  for (const command of registry.getAll()) {
    registerSingleCommand(cli, command, definition, runtime, project);
  }
  return cli;
}
