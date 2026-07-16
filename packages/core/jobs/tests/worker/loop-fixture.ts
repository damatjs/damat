import type { ClaimedJobRun } from "../../src/worker/types";

export interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

export async function waitUntil(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 500;
  while (!check()) {
    if (Date.now() >= deadline) throw new Error("condition was not reached");
    await Bun.sleep(2);
  }
}

export const claim = {} as ClaimedJobRun;

export function workerOptions() {
  return {
    pollIntervalMs: 5,
    registryHeartbeatIntervalMs: 5,
    retryIntervalMs: 5,
  };
}

export function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    register: async () => {},
    poll: async () => [],
    heartbeat: async () => {},
    markStopping: async () => {},
    stop: async () => {},
    startExecution: () => ({
      promise: Promise.resolve(),
      abort: () => {},
    }),
    ...overrides,
  };
}
