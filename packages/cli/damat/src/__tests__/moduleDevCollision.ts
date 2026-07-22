import { moduleDevChild, within, type ProcessResult } from "./moduleDevProcess";

export async function runCollidingModuleDev(
  cwd: string,
  databaseUrl: string,
  port: number,
): Promise<ProcessResult> {
  const child = moduleDevChild(cwd, databaseUrl, port);
  const result = Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]).then(([code, stdout, stderr]) => ({ code, stdout, stderr }));
  return within(result, 8_000);
}
