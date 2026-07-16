import { expect, test } from "bun:test";
import { JobWorker } from "../../src/worker/loop";
import {
  claim,
  deferred,
  dependencies,
  waitUntil,
  workerOptions,
} from "./loop-fixture";

test("grace timeout aborts work and delays the stopped state", async () => {
  const work = deferred<void>();
  let polls = 0;
  let aborts = 0;
  let stopped = 0;
  const deps = dependencies({
    poll: async () => (polls++ === 0 ? [claim] : []),
    startExecution: () => ({
      promise: work.promise,
      abort: () => aborts++,
    }),
    stop: async () => stopped++,
  });
  const worker = new JobWorker(workerOptions(), deps as never);
  worker.start();
  await waitUntil(() => polls > 0);
  await worker.stop({ graceMs: 2 });
  expect(aborts).toBe(1);
  expect(stopped).toBe(0);
  work.resolve();
  await waitUntil(() => stopped === 1);
});

test("stop waits for an in-flight poll and starts no new work", async () => {
  const polling = deferred<(typeof claim)[]>();
  let pollStarted = false;
  let executions = 0;
  const deps = dependencies({
    poll: () => {
      pollStarted = true;
      return polling.promise;
    },
    startExecution: () => {
      executions++;
      return { promise: Promise.resolve(), abort: () => {} };
    },
  });
  const worker = new JobWorker(workerOptions(), deps as never);
  worker.start();
  await waitUntil(() => pollStarted);
  const stopping = worker.stop({ graceMs: 2 });
  polling.resolve([claim]);
  await stopping;
  expect(executions).toBe(0);
});

test("boot and registry shutdown failures remain explicit but bounded", async () => {
  const bootFailure = new JobWorker(
    workerOptions(),
    dependencies({
      register: async () => {
        throw new Error("registration failed");
      },
    }) as never,
  );
  bootFailure.start();
  await waitUntil(() => !bootFailure.isRunning);
  await bootFailure.stop();

  const shutdownFailure = new JobWorker(
    workerOptions(),
    dependencies({
      markStopping: async () => {
        throw new Error("mark failed");
      },
      stop: async () => {
        throw new Error("stop failed");
      },
    }) as never,
  );
  shutdownFailure.start();
  await Bun.sleep(2);
  await shutdownFailure.stop();
  await shutdownFailure.stop();
});
