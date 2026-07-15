import type { CliLogger, CliRuntime } from "../types";
import type { CapabilityTestLog, CapabilityTestRuntime } from "./types";

export function createCapabilityTestRuntime(
  args: readonly string[] = [],
): CapabilityTestRuntime {
  const logs: CapabilityTestLog[] = [];
  const output: string[] = [];
  const record = (level: CapabilityTestLog["level"]) => (message: string) => {
    logs.push({ level, message });
  };
  const logger: CliLogger = {
    debug: record("debug"),
    info: record("info"),
    success: record("success"),
    skip: record("skip"),
    warn: record("warn"),
    error: record("error"),
  };
  const runtime: CliRuntime = {
    args,
    cwd: "/workspace",
    env: {},
    logger,
    output: { write: (message = "") => output.push(message) },
  };
  return { runtime, output, logs };
}
