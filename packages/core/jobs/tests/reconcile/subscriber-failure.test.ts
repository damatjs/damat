import { expect, test } from "bun:test";
import { startJobWakeupSubscriber } from "../../src/wakeup";

test("subscription setup failure degrades to a no-op", async () => {
  let quit = 0;
  const stop = await startJobWakeupSubscriber(
    {
      duplicate: () => ({
        on: () => {},
        off: () => {},
        unsubscribe: async () => 0,
        subscribe: async () => {
          throw new Error("offline");
        },
        quit: async () => (quit += 1),
      }),
    },
    () => {},
  );
  await stop();
  expect(quit).toBe(1);
});

test("subscription shutdown absorbs cleanup failures", async () => {
  let cleanupAttempts = 0;
  const stop = await startJobWakeupSubscriber(
    {
      duplicate: () => ({
        on: () => {},
        off: () => {},
        subscribe: async () => 1,
        unsubscribe: async () => {
          cleanupAttempts += 1;
          throw new Error("unsubscribe failed");
        },
        quit: async () => {
          cleanupAttempts += 1;
          throw new Error("quit failed");
        },
      }),
    },
    () => {},
  );
  await expect(stop()).resolves.toBeUndefined();
  expect(cleanupAttempts).toBe(2);
});

test("subscription setup absorbs connection cleanup failure", async () => {
  const stop = await startJobWakeupSubscriber(
    {
      duplicate: () => ({
        on: () => {},
        off: () => {},
        unsubscribe: async () => 0,
        subscribe: async () => {
          throw new Error("offline");
        },
        quit: async () => {
          throw new Error("quit failed");
        },
      }),
    },
    () => {},
  );
  await expect(stop()).resolves.toBeUndefined();
});
