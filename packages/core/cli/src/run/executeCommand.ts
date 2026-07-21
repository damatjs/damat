import type {
  CliDefinition,
  CliRunResult,
  CliRuntime,
  Command,
} from "../types";
import { CliError } from "../errors";
import { reportError, getExitCode } from "../utils/output";
import {
  applyDefaults,
  coerceOptions,
  validateOptions,
} from "../utils/validate";
import { buildCommandContext } from "./buildCommand";

export async function executeCommand(
  command: Command,
  commandName: string,
  rawArgs: readonly string[],
  parsedOptions: Record<string, unknown>,
  definition: CliDefinition,
  runtime: CliRuntime,
  projectConfig: unknown,
): Promise<CliRunResult> {
  let options = coerceOptions(parsedOptions, command.options);
  options = applyDefaults(options, command.options);
  const context = buildCommandContext(commandName, rawArgs, options, runtime);

  try {
    validateOptions(options, command.options, commandName);
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    runtime.logger.error(error.message);
    return { exitCode: error.exitCode, command: commandName };
  }

  if (projectConfig !== null) {
    context.options.config = projectConfig;
  }
  if (context.options.verbose) {
    if (definition.verbose?.handler !== "manual") {
      runtime.logger.info("Verbose mode enabled");
    }
    runtime.logger.debug("Verbose mode enabled");
  }

  try {
    const result = await command.handler(context);
    return { exitCode: result.exitCode, command: commandName };
  } catch (error) {
    reportError(runtime.logger, runtime.output, error, {
      prefix: "Command failed",
      verbose: Boolean(context.options.verbose),
    });
    definition.onError?.(
      error instanceof Error ? error : new Error(String(error)),
      context,
    );
    return { exitCode: getExitCode(error), command: commandName };
  }
}
