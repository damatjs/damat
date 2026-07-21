import type { CliLogger, CliOutput } from "./io";

export interface CliRuntime {
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string | undefined>>;
  logger: CliLogger;
  output: CliOutput;
}

export interface CliRunResult {
  exitCode: number;
  command?: string;
}
