import { expect, test } from "bun:test";
import { createInternalJobWorker } from "../../src/worker/internal";
import {
  claim,
  deferred,
  dependencies,
  waitUntil,
  workerOptions,
} from "./loop-fixture";

test("stop drains after claims close while maintenance stays live", async () => {
  const work = deferred<void>();
  const pendingPoll = deferred<(typeof claim)[]>();
  let polls = 0;
  let heartbeats = 0;
  let marks = 0;
  let stops = 0;
  const worker = createInternalJobWorker(
    { ...workerOptions(), registryHeartbeatIntervalMs: 2 },
    dependencies({
      poll: () =>
        ++polls === 1 ? Promise.resolve([claim]) : pendingPoll.promise,
      heartbeat: async () => {
        heartbeats += 1;
      },
      markStopping: async () => {
        marks += 1;
      },
      stop: async () => {
        stops += 1;
      },
      startExecution: () => ({ promise: work.promise, abort: () => {} }),
    }) as never,
  );
  worker.start();
  await waitUntil(() => polls === 2 && heartbeats > 0);

  const stopping = worker.stop({ graceMs: 100 });
  await Bun.sleep(5);
  expect(marks).toBe(0);
  pendingPoll.resolve([]);
  await waitUntil(() => marks === 1);

  const heartbeatAtDrain = heartbeats;
  await waitUntil(() => heartbeats > heartbeatAtDrain);
  expect(stops).toBe(0);
  work.resolve();
  await stopping;
  expect(stops).toBe(1);

  const heartbeatAtStop = heartbeats;
  await Bun.sleep(5);
  expect(heartbeats).toBe(heartbeatAtStop);
});
