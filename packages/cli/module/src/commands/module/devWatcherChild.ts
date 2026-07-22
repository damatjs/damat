import { spawn } from "bun";

export type ModuleDevChild = ReturnType<typeof spawn>;

export interface ModuleDevWatcherOptions {
  cwd: string;
  entryFile: string;
  port?: number;
}

export function spawnModuleDevChild(
  options: ModuleDevWatcherOptions,
  run: typeof spawn = spawn,
): ModuleDevChild {
  return run({
    cmd: ["bun", options.entryFile],
    cwd: options.cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      ...(options.port !== undefined ? { PORT: String(options.port) } : {}),
    },
  });
}
