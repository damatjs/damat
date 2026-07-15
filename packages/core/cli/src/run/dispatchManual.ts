import type {
  CliDefinition,
  CliRunResult,
  CliRuntime,
  CommandRegistry,
} from "../types";
import { parseCommandArgs } from "./buildCommand";
import { runCommand, type ProjectConfigAccessor } from "./runCommand";

export async function dispatchManual(
  definition: CliDefinition,
  runtime: CliRuntime,
  registry: CommandRegistry,
  project?: ProjectConfigAccessor,
): Promise<CliRunResult | undefined> {
  const [name, subcommand] = runtime.args;
  if (!name) return undefined;
  const command = registry.get(name);

  if (!command) {
    const fallback = definition.defaultCommand
      ? registry.get(definition.defaultCommand)
      : undefined;
    if (!fallback) return undefined;
    const parsed = parseCommandArgs([...runtime.args], fallback.options);
    return runCommand(
      fallback,
      fallback.name,
      parsed.positional,
      parsed.options,
      definition,
      runtime,
      project,
    );
  }
  if (!command.subcommands || !subcommand) return undefined;
  const child = registry.get(`${command.name}:${subcommand}`);
  if (!child || child === command) return undefined;
  const parsed = parseCommandArgs(runtime.args.slice(2), child.options);
  return runCommand(
    child,
    `${command.name}:${subcommand}`,
    parsed.positional,
    parsed.options,
    definition,
    runtime,
    project,
  );
}
