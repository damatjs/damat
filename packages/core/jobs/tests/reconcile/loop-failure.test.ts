import { expect, test } from "bun:test";
import { createInternalJobWorker } from "../../src/worker/internal";
import { deferred, dependencies, waitUntil } from "../worker/loop-fixture";
import { FakeWakeupRedis } from "./wakeup-fixture";

test("reconciliation retries after a transient failure", async () => {
  let reconciles = 0;
  const worker = createInternalJobWorker(
    {
      reconcileIntervalMs: 5,
      registryHeartbeatIntervalMs: 25_000,
      pollIntervalMs: 60_000,
    },
    dependencies({
      reconcile: async () => {
        reconciles += 1;
        if (reconciles === 1) throw new Error("temporary reconcile failure");
      },
    }) as never,
  );
  worker.start();
  await waitUntil(() => reconciles >= 2);
  await worker.stop();
  expect(reconciles).toBeGreaterThanOrEqual(2);
});

test("subscription dependency failure never stops polling", async () => {
  let polls = 0;
  const worker = createInternalJobWorker(
    {
      pollIntervalMs: 5,
      registryHeartbeatIntervalMs: 25_000,
      wakeupRedis: new FakeWakeupRedis(),
    },
    dependencies({
      poll: async () => ((polls += 1), []),
      subscribeWakeups: async () => {
        throw new Error("subscription dependency failed");
      },
    }) as never,
  );
  worker.start();
  await waitUntil(() => polls >= 2);
  await worker.stop();
  expect(polls).toBeGreaterThanOrEqual(2);
});

test("stop absorbs an in-flight reconciliation failure", async () => {
  const reconciliation = deferred<void>();
  let started = false;
  let stoppedPersisted = false;
  const worker = createInternalJobWorker(
    {
      reconcileIntervalMs: 60_000,
      registryHeartbeatIntervalMs: 25_000,
      pollIntervalMs: 60_000,
    },
    dependencies({
      reconcile: () => {
        started = true;
        return reconciliation.promise;
      },
      stop: async () => {
        stoppedPersisted = true;
      },
    }) as never,
  );
  worker.start();
  await waitUntil(() => started);
  const stopping = worker.stop();
  await waitUntil(() => stoppedPersisted);
  reconciliation.reject(new Error("reconciliation stopped"));
  await expect(stopping).resolves.toBeUndefined();
  expect(worker.isRunning).toBeFalse();
});
