import { expect, test } from "bun:test";
import { createInternalJobWorker } from "../../src/worker/internal";
import type { StopJobWakeupSubscriber } from "../../src/wakeup";
import { deferred, dependencies, waitUntil } from "../worker/loop-fixture";
import { FakeWakeupRedis } from "./wakeup-fixture";

test("worker owns reconciliation and wake-up lifecycle", async () => {
  let polls = 0;
  let reconciles = 0;
  let stoppedSubscriptions = 0;
  let wake: ((queue: string) => void) | undefined;
  const deps = dependencies({
    poll: async () => (polls++, []),
    reconcile: async () => {
      reconciles += 1;
    },
    subscribeWakeups: async (
      _redis: FakeWakeupRedis,
      listener: (queue: string) => void,
    ): Promise<StopJobWakeupSubscriber> => {
      wake = listener;
      return async () => {
        stoppedSubscriptions += 1;
      };
    },
  });
  const worker = createInternalJobWorker(
    {
      queue: "lifecycle",
      pollIntervalMs: 60_000,
      registryHeartbeatIntervalMs: 25_000,
      retryIntervalMs: 5,
      reconcileIntervalMs: 5,
      wakeupRedis: new FakeWakeupRedis(),
    },
    deps as never,
  );
  worker.start();
  await waitUntil(() => polls === 1 && reconciles > 0 && Boolean(wake));
  wake!("other");
  await Bun.sleep(5);
  expect(polls).toBe(1);
  wake!("lifecycle");
  await waitUntil(() => polls === 2);
  await worker.stop();
  const stoppedAt = reconciles;
  await Bun.sleep(10);
  expect(stoppedSubscriptions).toBe(1);
  expect(reconciles).toBe(stoppedAt);
});

test("stop during subscription startup closes the late subscriber", async () => {
  const subscription = deferred<StopJobWakeupSubscriber>();
  let subscribeStarted = false;
  let subscriberStops = 0;
  const worker = createInternalJobWorker(
    {
      pollIntervalMs: 60_000,
      registryHeartbeatIntervalMs: 25_000,
      wakeupRedis: new FakeWakeupRedis(),
    },
    dependencies({
      subscribeWakeups: () => {
        subscribeStarted = true;
        return subscription.promise;
      },
    }) as never,
  );
  worker.start();
  await waitUntil(() => subscribeStarted);
  const stopping = worker.stop();
  subscription.resolve(async () => {
    subscriberStops += 1;
  });
  await stopping;
  expect(subscriberStops).toBe(1);
});
