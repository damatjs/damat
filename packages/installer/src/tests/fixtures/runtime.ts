import type { CommandResult, CommandRunner } from "../../types";

export const success: CommandResult = { exitCode: 0, stdout: "", stderr: "" };

export function recordingRunner(
  calls: Array<{ command: string; args: string[]; cwd: string }>,
  beforeReturn?: CommandRunner,
): CommandRunner {
  return async (spec) => {
    calls.push({ command: spec.command, args: spec.args, cwd: spec.cwd });
    return beforeReturn ? beforeReturn(spec) : success;
  };
}
