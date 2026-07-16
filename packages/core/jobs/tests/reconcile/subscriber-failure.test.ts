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
