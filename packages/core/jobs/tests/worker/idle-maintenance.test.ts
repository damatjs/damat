import { expect, test } from "bun:test";
import { createInternalJobWorker } from "../../src/worker/internal";
import {
  claim,
  deferred,
  dependencies,
  waitUntil,
  workerOptions,
} from "./loop-fixture";

test("maintenance continues after ordinary work becomes idle", async () => {
  const work = deferred<void>();
  let polls = 0;
  let heartbeats = 0;
  let reconciles = 0;
  const worker = createInternalJobWorker(
    {
      ...workerOptions(),
      registryHeartbeatIntervalMs: 2,
      reconcileIntervalMs: 2,
      pollIntervalMs: 60_000,
    },
    dependencies({
      poll: async () => (polls++ ? [] : [claim]),
      heartbeat: async () => {
        heartbeats += 1;
      },
      reconcile: async () => {
        reconciles += 1;
      },
      startExecution: () => ({ promise: work.promise, abort: () => {} }),
    }) as never,
  );
  worker.start();
  await waitUntil(() => polls > 0 && heartbeats > 0 && reconciles > 0);

  work.resolve();
  await Bun.sleep(5);
  const idleCounts = [heartbeats, reconciles];
  await waitUntil(
    () => heartbeats > idleCounts[0]! && reconciles > idleCounts[1]!,
  );

  expect(worker.isRunning).toBeTrue();
  await worker.stop();
});
