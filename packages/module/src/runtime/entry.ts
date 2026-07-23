import { ModulePortInUseError } from "./server";
import { startModuleApp } from "./start";
import type { RunningModuleApp } from "./types";

interface ModuleEntryDependencies {
  start: typeof startModuleApp;
  log: (message: string) => void;
  error: (...values: unknown[]) => void;
  exit: (code: number) => void;
  once: (signal: NodeJS.Signals, listener: () => void) => void;
  notifyStopping: () => void;
}

const MODULE_ENTRY_STOPPING_MESSAGE = "damat:module-entry-stopping";

const defaultDependencies: ModuleEntryDependencies = {
  start: startModuleApp,
  log: (message) => console.log(message),
  error: (...values) => console.error(...values),
  exit: (code) => process.exit(code),
  once: (signal, listener) => void process.once(signal, listener),
  notifyStopping: () => {
    try {
      if (process.connected) process.send?.(MODULE_ENTRY_STOPPING_MESSAGE);
    } catch {}
  },
};

export function moduleReadyLines(running: RunningModuleApp): string[] {
  const url = `http://localhost:${running.port}`;
  return [
    `✓ Module "${running.manifest.name}" ready at ${url}`,
    `  Routes mounted under ${url}${running.routeBasePath}`,
    "  Press Ctrl-C to stop",
  ];
}

function reportStartError(
  error: unknown,
  dependencies: ModuleEntryDependencies,
): void {
  if (error instanceof ModulePortInUseError) {
    dependencies.error(error.message);
    dependencies.error("Use: damat module dev --port <port>");
    return;
  }
  dependencies.error("Failed to start module:", error);
}

function installShutdown(
  running: RunningModuleApp,
  dependencies: ModuleEntryDependencies,
): void {
  let stopping: Promise<void> | undefined;
  const stop = () => {
    if (stopping) return stopping;
    dependencies.notifyStopping();
    stopping = Promise.resolve()
      .then(() => running.stop())
      .then(() => dependencies.exit(0))
      .catch((error) => {
        dependencies.error("Failed to stop module:", error);
        dependencies.exit(1);
      });
    return stopping;
  };
  dependencies.once("SIGINT", () => void stop());
  dependencies.once("SIGTERM", () => void stop());
}

export async function runModuleEntry(
  overrides: Partial<ModuleEntryDependencies> = {},
): Promise<void> {
  const dependencies = { ...defaultDependencies, ...overrides };
  try {
    const running = await dependencies.start();
    for (const line of moduleReadyLines(running)) dependencies.log(line);
    installShutdown(running, dependencies);
  } catch (error) {
    reportStartError(error, dependencies);
    dependencies.exit(1);
  }
}
