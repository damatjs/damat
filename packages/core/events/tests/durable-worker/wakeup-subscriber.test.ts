import { expect, test } from "bun:test";
import {
  EVENT_WAKEUP_CHANNEL,
  startEventWakeupSubscriber,
  type EventWakeupConnection,
} from "../../src";

test("subscriber delivers strict messages and absorbs cleanup failures", async () => {
  let listener: ((channel: string, message: string) => void) | undefined;
  let errorListener: ((error: Error) => void) | undefined;
  const connection: EventWakeupConnection = {
    subscribe: async () => {},
    unsubscribe: async () => {
      throw new Error("unsubscribe failed");
    },
    quit: async () => {
      throw new Error("quit failed");
    },
    on: (event, value) => {
      if (event === "message") listener = value as typeof listener;
      else errorListener = value as typeof errorListener;
    },
    off: () => {},
  };
  const messages: unknown[] = [];
  const stop = await startEventWakeupSubscriber(
    { duplicate: () => connection },
    (message) => messages.push(message),
  );
  listener?.(EVENT_WAKEUP_CHANNEL, '{"kind":"events","target":"router"}');
  listener?.(EVENT_WAKEUP_CHANNEL, '{"kind":"events","target":"router","x":1}');
  expect(messages).toEqual([{ kind: "events", target: "router" }]);
  expect(() => errorListener?.(new Error("redis down"))).not.toThrow();
  await expect(stop()).resolves.toBeUndefined();
});
