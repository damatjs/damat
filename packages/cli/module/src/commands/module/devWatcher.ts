import { watch } from "node:fs";
import {
  type ModuleDevChild,
  type ModuleDevWatcherOptions,
  spawnModuleDevChild,
} from "./devWatcherChild";
import { forwardSignalUnlessHandled } from "./devWatcherSignal";

type Watch = ReturnType<typeof watch>;
export interface ModuleDevWatcher {
  exited: Promise<number>;
  kill(signal?: number | NodeJS.Signals): void;
}
interface WatcherDependencies {
  launch: typeof spawnModuleDevChild;
  watch: typeof watch;
  error: (...values: unknown[]) => void;
}
const defaults: WatcherDependencies = {
  launch: spawnModuleDevChild,
  watch,
  error: console.error,
};

function ignored(filename: string | null): boolean {
  if (!filename) return false;
  const first = filename.replaceAll("\\", "/").split("/")[0];
  return [".damat", ".git", "coverage", "dist", "node_modules"].includes(
    first ?? "",
  );
}

export function startModuleDevWatcher(
  options: ModuleDevWatcherOptions,
  dependencies: WatcherDependencies = defaults,
): ModuleDevWatcher {
  let child: ModuleDevChild | undefined;
  let watcher: Watch | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let restarting = false;
  let stopping = false;
  let settled = false;
  let resolveExit!: (code: number) => void;
  const exited = new Promise<number>((resolve) => void (resolveExit = resolve));
  const finish = (code: number) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    watcher?.close();
    resolveExit(code);
  };
  const launch = () => {
    const current = dependencies.launch(options);
    child = current;
    void current.exited.then((code) => {
      child = undefined;
      if (stopping) finish(code);
      else if (restarting) {
        restarting = false;
        try {
          launch();
        } catch (error) {
          dependencies.error("Failed to restart module:", error);
          finish(1);
        }
      } else finish(code);
    });
  };
  const restart = () => {
    if (stopping || restarting) return;
    restarting = true;
    child!.kill("SIGTERM");
  };
  watcher = dependencies.watch(
    options.cwd,
    { recursive: true },
    (_event, filename) => {
      if (ignored(filename)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(restart, 50);
    },
  );
  try {
    launch();
  } catch (error) {
    watcher.close();
    throw error;
  }
  return {
    exited,
    kill: (signal = "SIGTERM") => {
      if (stopping) return;
      stopping = true;
      watcher?.close();
      if (timer) clearTimeout(timer);
      if (child) forwardSignalUnlessHandled(child, signal);
      else finish(0);
    },
  };
}
