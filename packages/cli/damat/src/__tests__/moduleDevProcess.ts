import { dirname } from "node:path";
import { waitForReadiness } from "./moduleDevReadiness";
type Child = ReturnType<typeof Bun.spawn>;
export interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}
export interface RunningModuleDev {
  port: number;
  output: () => string;
  waitForReadiness: (count: number) => Promise<number>;
  stop: () => Promise<ProcessResult>;
}
export function moduleDevEnv(
  databaseUrl: string,
): Record<string, string | undefined> {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    LOG_LEVEL: "fatal",
    REDIS_URL: "",
    NO_COLOR: "1",
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ""}`,
  };
}
export async function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Module dev timed out")), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}
async function read(
  stream: ReadableStream<Uint8Array>,
  update?: (text: string) => void,
): Promise<string> {
  let text = "";
  for await (const chunk of stream) {
    text += new TextDecoder().decode(chunk);
    update?.(text);
  }
  return text;
}
export function moduleDevChild(
  cwd: string,
  databaseUrl: string,
  port: number,
): Child {
  return Bun.spawn([process.execPath, "run", "dev", "--port", String(port)], {
    cwd,
    env: moduleDevEnv(databaseUrl),
    stdout: "pipe",
    stderr: "pipe",
  });
}
export async function startModuleDev(
  cwd: string,
  databaseUrl: string,
): Promise<RunningModuleDev> {
  const child = moduleDevChild(cwd, databaseUrl, 0);
  let output = "";
  let ready!: (port: number) => void;
  let failed!: (error: Error) => void;
  const listening = new Promise<number>((resolve, reject) => {
    ready = resolve;
    failed = reject;
  });
  const stdout = read(child.stdout, (text) => {
    output = text;
    const match = text.match(/ready at http:\/\/localhost:(\d+)/);
    if (match) ready(Number(match[1]));
  });
  const stderr = read(child.stderr);
  void child.exited.then(async (code) =>
    failed(new Error(`Module dev exited ${code}: ${await stderr}`)),
  );
  try {
    const port = await within(listening, 30_000);
    return {
      port,
      output: () => output,
      waitForReadiness: (count) => waitForReadiness(() => output, count),
      stop: async () => {
        child.kill("SIGINT");
        const code = await within(child.exited, 15_000);
        return { code, stdout: await stdout, stderr: await stderr };
      },
    };
  } catch (error) {
    child.kill("SIGKILL");
    await child.exited;
    throw error;
  }
}
