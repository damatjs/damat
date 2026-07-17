import { expect, test } from "bun:test";
import {
  EVENT_WAKEUP_CHANNEL,
  startEventWakeupSubscriber,
  type EventWakeupConnection,
} from "../../src";

test("subscriber delivers strict messages and absorbs cleanup failures", async () => {
  let listener: ((channel: string, message: string) => void) | undefined;
  const connection: EventWakeupConnection = {
    subscribe: async () => {},
    unsubscribe: async () => {
      throw new Error("unsubscribe failed");
    },
    quit: async () => {
      throw new Error("quit failed");
    },
    on: (_event, value) => void (listener = value),
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
  await expect(stop()).resolves.toBeUndefined();
});
