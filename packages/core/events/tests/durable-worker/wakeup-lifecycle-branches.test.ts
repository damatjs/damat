import { expect, test } from "bun:test";
import type { EventWakeupConnection } from "../../src";
import { EventWorkerWakeupLifecycle } from "../../src/durable/worker/wakeup-lifecycle";
import { resolveEventWorkerOptions } from "../../src/durable/worker/runtime-options";

test("worker wakeups select exact deliveries and clean up", async () => {
  let listener: Parameters<EventWakeupConnection["on"]>[1] = () => {};
  let closed = 0;
  const connection = createConnection({
    on: (_event, value) => void (listener = value),
    unsubscribe: async () => void closed++,
    quit: async () => void closed++,
  });
  let wakes = 0;
  const lifecycle = createLifecycle(connection, () => void wakes++);
  lifecycle.start();
  await Bun.sleep(0);
  listener("damat:events:wakeup", '{"kind":"events","target":"router"}');
  listener("damat:events:wakeup", delivery("other", "consumer"));
  listener("damat:events:wakeup", delivery("chosen", "consumer"));
  expect(wakes).toBe(1);
  await lifecycle.stop();
  expect(closed).toBe(2);
});

test("stop during subscription closes the late connection", async () => {
  let release!: () => void;
  const subscribed = new Promise<void>((resolve) => void (release = resolve));
  let closed = 0;
  const connection = createConnection({
    subscribe: () => subscribed,
    unsubscribe: async () => void closed++,
    quit: async () => void closed++,
  });
  const lifecycle = createLifecycle(connection, () => {});
  lifecycle.start();
  await Bun.sleep(0);
  const stopping = lifecycle.stop();
  release();
  await stopping;
  expect(closed).toBe(2);
});

test("missing Redis and failed subscription stop safely", async () => {
  const noRedis = new EventWorkerWakeupLifecycle(
    resolveEventWorkerOptions({
      consumers: [{ event: "chosen", consumer: "consumer" }],
    }),
    () => {},
  );
  noRedis.start();
  await noRedis.stop();
  const failed = createLifecycle(
    createConnection({
      subscribe: async () => Promise.reject("subscribe failed"),
      quit: async () => Promise.reject("quit failed"),
    }),
    () => {},
  );
  failed.start();
  await Bun.sleep(0);
  await expect(failed.stop()).resolves.toBeUndefined();
});

function createLifecycle(connection: EventWakeupConnection, wake: () => void) {
  return new EventWorkerWakeupLifecycle(
    resolveEventWorkerOptions({
      consumers: [{ event: "chosen", consumer: "consumer" }],
      wakeupRedis: { duplicate: () => connection },
    }),
    wake,
  );
}

function createConnection(
  overrides: Partial<EventWakeupConnection>,
): EventWakeupConnection {
  return {
    subscribe: async () => {},
    unsubscribe: async () => {},
    quit: async () => {},
    on: () => {},
    off: () => {},
    ...overrides,
  };
}

const delivery = (event: string, consumer: string) =>
  JSON.stringify({
    kind: "events",
    target: "delivery",
    event,
    consumer,
  });
