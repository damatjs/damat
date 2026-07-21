import { CliError } from "../../errors";
import type { CliLogger, CliOutput } from "../../types";

export interface ReportErrorOptions {
  verbose?: boolean;
  prefix?: string;
}

export function getExitCode(error: unknown): number {
  return error instanceof CliError ? error.exitCode : 1;
}

export function reportError(
  logger: CliLogger,
  error: unknown,
  options?: ReportErrorOptions,
): void;
export function reportError(
  logger: CliLogger,
  output: CliOutput,
  error: unknown,
  options: ReportErrorOptions,
): void;
export function reportError(
  logger: CliLogger,
  outputOrError: CliOutput | unknown,
  errorOrOptions?: unknown,
  explicitOptions?: ReportErrorOptions,
): void {
  const explicitOutput = isOutput(outputOrError);
  const output = explicitOutput
    ? outputOrError
    : { write: (message = "") => logger.info(message) };
  const error = explicitOutput ? errorOrOptions : outputOrError;
  const options = (explicitOutput ? explicitOptions : errorOrOptions) as
    ReportErrorOptions | undefined;
  const verbose = options?.verbose ?? false;
  const normalized = error instanceof Error ? error : new Error(String(error));
  const label = formatLabel(normalized);
  logger.error(
    options?.prefix ? `${options.prefix}: ${label}` : label,
    verbose ? normalized : undefined,
  );

  let cause: unknown = (normalized as { cause?: unknown }).cause;
  for (let depth = 0; cause && depth < 5; depth++) {
    const current = cause instanceof Error ? cause : new Error(String(cause));
    logger.error(
      `↳ caused by: ${formatLabel(current)}`,
      verbose ? current : undefined,
    );
    cause = (current as { cause?: unknown }).cause;
  }
  if (!verbose)
    output.write("Run again with --verbose for the full stack trace.");
}

function isOutput(value: unknown): value is CliOutput {
  return typeof value === "object" && value !== null && "write" in value;
}

function formatLabel(error: Error): string {
  const name = error.name && error.name !== "Error" ? `${error.name}: ` : "";
  return `${name}${error.message}`;
}
