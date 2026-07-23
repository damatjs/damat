import { mock } from "bun:test";
import { startModuleDevWatcher } from "../commands/module/devWatcher";

interface ControlledChild {
  exited: Promise<number>;
  shutdownStarted: Promise<void>;
  acknowledge(): void;
  finish(code: number): void;
  kill: ReturnType<typeof mock>;
}

function child(): ControlledChild {
  let finish!: (code: number) => void;
  let acknowledge!: () => void;
  return {
    exited: new Promise((resolve) => void (finish = resolve)),
    shutdownStarted: new Promise((resolve) => void (acknowledge = resolve)),
    acknowledge,
    finish,
    kill: mock(() => {}),
  };
}

export function watcherFixture(failLaunch?: number) {
  const children: ControlledChild[] = [];
  const close = mock(() => {});
  const error = mock(() => {});
  let notify = (_filename: string | null) => {};
  let launches = 0;
  const launch = mock(() => {
    launches += 1;
    if (launches === failLaunch) throw new Error("launch failed");
    const next = child();
    children.push(next);
    return next as never;
  });
  const watch = mock(
    (
      _cwd: string,
      _options: unknown,
      listener: (event: string, filename: string | null) => void,
    ) => {
      notify = (filename) => listener("change", filename);
      return { close } as never;
    },
  );
  const start = () =>
    startModuleDevWatcher(
      { cwd: "/module", entryFile: "/module/.damat/entry.ts", port: 0 },
      { launch: launch as never, watch: watch as never, error },
    );
  return {
    children,
    close,
    error,
    launch,
    notify: (name: string | null) => notify(name),
    start,
  };
}
