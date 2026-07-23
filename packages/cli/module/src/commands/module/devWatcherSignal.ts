import type { ModuleDevChild } from "./devWatcherChild";

const SIGNAL_FALLBACK_MS = 100;

export function forwardSignalUnlessHandled(
  child: ModuleDevChild,
  signal: number | NodeJS.Signals,
): void {
  const timer = setTimeout(() => child.kill(signal), SIGNAL_FALLBACK_MS);
  const cancel = () => clearTimeout(timer);
  void child.shutdownStarted.then(cancel);
  void child.exited.then(cancel);
}
