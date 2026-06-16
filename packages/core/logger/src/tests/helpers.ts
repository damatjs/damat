import { spyOn } from "bun:test";

/**
 * Captures all console output (log/warn/error) by spying on the global
 * console methods. This is the underlying sink the Logger writes to, so
 * spying here lets us assert on routing + content WITHOUT polluting real
 * stdout/stderr during the test run.
 */
export interface ConsoleCapture {
  log: ReturnType<typeof spyOn>;
  warn: ReturnType<typeof spyOn>;
  error: ReturnType<typeof spyOn>;
  /** All args passed to console.log, flattened to the first arg (the formatted line). */
  logLines: () => string[];
  warnLines: () => string[];
  errorLines: () => string[];
  restore: () => void;
}

export function captureConsole(): ConsoleCapture {
  const log = spyOn(console, "log").mockImplementation(() => {});
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  const error = spyOn(console, "error").mockImplementation(() => {});

  const lines = (spy: ReturnType<typeof spyOn>): string[] =>
    spy.mock.calls.map((call) => String(call[0]));

  return {
    log,
    warn,
    error,
    logLines: () => lines(log),
    warnLines: () => lines(warn),
    errorLines: () => lines(error),
    restore: () => {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    },
  };
}

/**
 * Strip ANSI escape codes so assertions on message content are not coupled
 * to colorization.
 */
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}
