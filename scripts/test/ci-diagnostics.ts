function escapeWorkflowCommand(value: string): string {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

export function reportCiFailure(title: string, detail: unknown): void {
  if (!process.env.GITHUB_ACTIONS) return;
  const text = detail instanceof Error ? detail.stack : String(detail);
  const tail = (text ?? "Unknown failure").slice(-8_000);
  console.error(`::error title=${title}::${escapeWorkflowCommand(tail)}`);
}

export async function runDiagnosed(command: string[]): Promise<boolean> {
  const child = Bun.spawn(command, {
    env: process.env,
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  if (exitCode !== 0) {
    process.exitCode = exitCode;
    reportCiFailure("Repository runner tests failed", `${stdout}\n${stderr}`);
  }
  return exitCode === 0;
}
