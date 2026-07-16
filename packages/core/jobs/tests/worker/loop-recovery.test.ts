import { expect, test } from "bun:test";
import { JobWorker } from "../../src/worker/loop";
import {
  claim,
  deferred,
  dependencies,
  waitUntil,
  workerOptions,
} from "./loop-fixture";

test("a transient poll failure retries while the worker is running", async () => {
  let polls = 0;
  const deps = dependencies({
    poll: async () => {
      if (++polls === 1) throw new Error("temporary poll failure");
      return [];
    },
  });
  const worker = new JobWorker(workerOptions(), deps as never);
  worker.start();
  await waitUntil(() => polls >= 2);
  expect(worker.isRunning).toBe(true);
  await worker.stop();
});

test("registry heartbeat retries independently from a slow poll", async () => {
  const polling = deferred<(typeof claim)[]>();
  let heartbeats = 0;
  const deps = dependencies({
    poll: () => polling.promise,
    heartbeat: async () => {
      heartbeats++;
      if (heartbeats === 1) throw new Error("temporary heartbeat failure");
    },
  });
  const worker = new JobWorker(workerOptions(), deps as never);
  worker.start();
  await waitUntil(() => heartbeats >= 2);
  polling.resolve([]);
  await worker.stop();
  expect(heartbeats).toBeGreaterThanOrEqual(2);
});
