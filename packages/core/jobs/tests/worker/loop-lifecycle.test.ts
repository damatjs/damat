import { expect, test } from "bun:test";
import { createInternalJobWorker } from "../../src/worker/internal";
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
  const worker = createInternalJobWorker(workerOptions(), deps as never);
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
  const worker = createInternalJobWorker(workerOptions(), deps as never);
  worker.start();
  await waitUntil(() => pollStarted);
  const stopping = worker.stop({ graceMs: 2 });
  polling.resolve([claim]);
  await stopping;
  expect(executions).toBe(0);
});

test("boot failures remain explicit and bounded", async () => {
  const bootFailure = createInternalJobWorker(
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
});
