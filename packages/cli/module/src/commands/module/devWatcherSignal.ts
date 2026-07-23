import {
  MODULE_DEV_CHILD_STOP_MESSAGE,
  type ModuleDevChild,
} from "./devWatcherChild";

const SIGNAL_FALLBACK_MS = 500;

export function forwardSignalUnlessHandled(
  child: ModuleDevChild,
  signal: number | NodeJS.Signals,
): void {
  const timer = setTimeout(() => child.kill(signal), SIGNAL_FALLBACK_MS);
  const cancel = () => clearTimeout(timer);
  try {
    child.send(MODULE_DEV_CHILD_STOP_MESSAGE);
  } catch {}
  void child.shutdownStarted.then(cancel);
  void child.exited.then(cancel);
}
