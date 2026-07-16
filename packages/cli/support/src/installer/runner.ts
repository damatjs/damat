import type { CommandResult, CommandSpec } from "@damatjs/installer";

interface SpawnedCommand {
  exited: Promise<number>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
}

type SpawnCommand = (
  command: string[],
  options: { cwd: string; env: Record<string, string>; stdout: "pipe"; stderr: "pipe" },
) => SpawnedCommand;

function commandEnvironment(extra?: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries({ ...process.env, ...extra })
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

export async function runInstallerCommand(
  spec: CommandSpec,
  spawn: SpawnCommand = Bun.spawn as unknown as SpawnCommand,
): Promise<CommandResult> {
  const child = spawn([spec.command, ...spec.args], {
    cwd: spec.cwd,
    env: commandEnvironment(spec.env),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
}
