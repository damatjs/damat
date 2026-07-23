import type { Subprocess } from "bun";

export interface ProcessResult {
  code: number;
  output: string;
}

export async function runProcess(
  command: string[],
  cwd: string,
  env: Record<string, string | undefined> = process.env,
): Promise<ProcessResult> {
  const child = Bun.spawn(command, {
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, output: `${stdout}${stderr}` };
}

export async function collectOutput(
  child: Subprocess<"pipe", "pipe", "pipe">,
  update: (output: string) => void,
): Promise<string> {
  let output = "";
  for await (const chunk of child.stdout) {
    output += new TextDecoder().decode(chunk);
    update(output);
  }
  return output;
}
