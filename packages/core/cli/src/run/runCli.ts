import type { CliDefinition, CliRunResult, CliRuntime } from "../types";
import { withConfig } from "../config";
import { printDefaultHelp } from "../help";
import { createCommandRegistry } from "../registry";
import { createRuntime } from "../runtime";
import { printBanner } from "../utils/banner";
import { createCli } from "./createCli";
import { dispatchManual } from "./dispatchManual";
import { consumeGlobalOptions } from "./globalOptions";

export async function runCli(
  definition: CliDefinition,
  overrides: Partial<CliRuntime> = {},
): Promise<CliRunResult> {
  validateDefinition(definition);
  const baseRuntime = createRuntime(overrides);
  const global = consumeGlobalOptions(baseRuntime.args, definition);
  const runtime = { ...baseRuntime, args: global.args };
  const registry = createCommandRegistry();
  for (const command of definition.commands) registry.register(command);
  const project = definition.configLoader
    ? withConfig(definition.configLoader, runtime.cwd)
    : undefined;
  const cli = createCli(
    definition,
    runtime,
    registry,
    project,
    global.options,
  );

  if (typeof definition.banner === "object") {
    printBanner(definition, runtime.output, definition.banner);
  }
  if (
    runtime.args.length === 0 ||
    runtime.args[0] === "--help" ||
    runtime.args[0] === "-h"
  ) {
    printDefaultHelp(definition, registry.getAll(), runtime.output);
    return { exitCode: 0 };
  }
  if (runtime.args[0] === "--version" || runtime.args[0] === "-v") {
    runtime.output.write(definition.version);
    return { exitCode: 0 };
  }

  const manual = await dispatchManual(
    definition,
    runtime,
    registry,
    project,
    global.options,
  );
  if (manual) return manual;
  cli.parse(["bun", definition.name, ...runtime.args], { run: false });
  const matched = (await cli.runMatchedCommand()) as CliRunResult | undefined;
  if (matched) return matched;

  const command = runtime.args[0]!;
  runtime.logger.error(`Unknown command: ${command}`);
  runtime.output.write();
  printDefaultHelp(definition, registry.getAll(), runtime.output);
  return { exitCode: 1, command };
}

function validateDefinition(definition: CliDefinition): void {
  if (!definition.name) {
    throw new Error("CLI definition must have a 'name' property");
  }
  if (!definition.version) {
    throw new Error("CLI definition must have a 'version' property");
  }
}
