import type { ILogger } from "@damatjs/logger";
import { CliError } from "../../errors";

export interface ReportErrorOptions {
  /**
   * Force verbose output on/off. When omitted, verbosity is auto-detected from
   * `--verbose` on the command line or the `DAMAT_DEBUG` environment variable.
   */
  verbose?: boolean;
  /** Headline prefix, e.g. "Command failed" or "Failed to load config". */
  prefix?: string;
}

/**
 * Whether the CLI should print full stack traces. Detected from the global
 * `--verbose` flag or `DAMAT_DEBUG=1` so callers don't have to thread the flag
 * through every layer (the flag is global and not part of any command's option
 * definitions, so it is otherwise dropped during option coercion).
 */
export function isVerbose(override?: boolean): boolean {
  if (typeof override === "boolean") return override;
  return process.argv.includes("--verbose") || Boolean(process.env.DAMAT_DEBUG);
}

/** Resolve the process exit code for a thrown value (honors CliError.exitCode). */
export function getExitCode(error: unknown): number {
  return error instanceof CliError ? error.exitCode : 1;
}

function formatLabel(err: Error): string {
  // Plain "Error" adds no signal, so only surface meaningful error type names.
  const name = err.name && err.name !== "Error" ? `${err.name}: ` : "";
  return `${name}${err.message}`;
}

/**
 * Render a thrown value as a clear, structured CLI error:
 *  - a headline ("<prefix>: <Type>: <message>")
 *  - every `error.cause` in the chain on its own "↳ caused by:" line
 *  - full stack trace(s) only when verbose (via the logger's error formatter)
 *  - a hint pointing at --verbose when not verbose
 *
 * The stack is shown by passing the Error to `logger.error()` — the logger's
 * formatter already renders the name, message and dimmed stack.
 */
export function reportError(
  logger: ILogger,
  error: unknown,
  options: ReportErrorOptions = {},
): void {
  const verbose = isVerbose(options.verbose);
  const err = error instanceof Error ? error : new Error(String(error));

  const headline = options.prefix
    ? `${options.prefix}: ${formatLabel(err)}`
    : formatLabel(err);
  logger.error(headline, verbose ? err : undefined);

  // Walk the cause chain (capped to avoid pathological/cyclic chains).
  let cause: unknown = (err as { cause?: unknown }).cause;
  for (let depth = 0; cause && depth < 5; depth++) {
    const c = cause instanceof Error ? cause : new Error(String(cause));
    logger.error(`↳ caused by: ${formatLabel(c)}`, verbose ? c : undefined);
    cause = (c as { cause?: unknown }).cause;
  }

  if (!verbose) {
    console.error(
      "Run again with --verbose (or set DAMAT_DEBUG=1) for the full stack trace.",
    );
  }
}
