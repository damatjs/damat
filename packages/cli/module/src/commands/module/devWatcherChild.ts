import { spawn } from "bun";

export const MODULE_DEV_CHILD_STOPPING_MESSAGE = "damat:module-entry-stopping";
export const MODULE_DEV_CHILD_STOP_MESSAGE = "damat:module-entry-stop";

export interface ModuleDevChild {
  exited: Promise<number>;
  shutdownStarted: Promise<void>;
  kill(signal?: number | NodeJS.Signals): void;
  send(message: unknown): void;
}

export interface ModuleDevWatcherOptions {
  cwd: string;
  entryFile: string;
  port?: number;
}

export function spawnModuleDevChild(
  options: ModuleDevWatcherOptions,
  run: typeof spawn = spawn,
): ModuleDevChild {
  let acknowledge!: () => void;
  const shutdownStarted = new Promise<void>(
    (resolve) => void (acknowledge = resolve),
  );
  const child = run({
    cmd: ["bun", options.entryFile],
    cwd: options.cwd,
    stdout: "inherit",
    stderr: "inherit",
    ipc: (message) => {
      if (message === MODULE_DEV_CHILD_STOPPING_MESSAGE) acknowledge();
    },
    env: {
      ...process.env,
      ...(options.port !== undefined ? { PORT: String(options.port) } : {}),
    },
  });
  return Object.assign(child, { shutdownStarted });
}
