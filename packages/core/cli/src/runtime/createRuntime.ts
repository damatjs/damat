import type { CliRuntime } from "../types";
import { createDefaultLogger } from "./defaultLogger";
import { createDefaultOutput } from "./defaultOutput";

export function createRuntime(overrides: Partial<CliRuntime> = {}): CliRuntime {
  return {
    args: overrides.args ?? process.argv.slice(2),
    cwd: overrides.cwd ?? process.cwd(),
    env: overrides.env ?? { ...process.env },
    logger: overrides.logger ?? createDefaultLogger(),
    output: overrides.output ?? createDefaultOutput(),
  };
}
