import type {
  CliDefinition,
  CliRunResult,
  CliRuntime,
  Command,
} from "../types";
import { getExitCode, reportError } from "../utils/output";
import { executeCommand } from "./executeCommand";

export type ProjectConfigAccessor = { get(): Promise<unknown> };

export async function runCommand(
  command: Command,
  name: string,
  args: readonly string[],
  options: Record<string, unknown>,
  definition: CliDefinition,
  runtime: CliRuntime,
  project?: ProjectConfigAccessor,
): Promise<CliRunResult> {
  try {
    const projectConfig = project ? await project.get() : null;
    return executeCommand(
      command,
      name,
      args,
      options,
      definition,
      runtime,
      projectConfig,
    );
  } catch (error) {
    reportError(runtime.logger, runtime.output, error, {
      prefix: "Failed to load configuration",
      verbose: Boolean(options.verbose),
    });
    return { exitCode: getExitCode(error), command: name };
  }
}
