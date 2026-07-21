import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  getDurabilityClient,
  setDurabilityClient,
  type DurabilityClient,
} from "@damatjs/durability";
import { EventDeliveryPollLoop } from "../../src/durable/worker/poll-loop";
import { resolveEventWorkerOptions } from "../../src/durable/worker/runtime-options";
import type { ClaimedEventDelivery } from "../../src";
import { waitUntil } from "./wait";

let previous: DurabilityClient | undefined;
beforeEach(() => {
  try {
    previous = getDurabilityClient();
  } catch {
    previous = undefined;
  }
});
afterEach(() =>
  previous ? setDurabilityClient(previous) : clearDurabilityClient(),
);

test("poll wake coalesces in flight and respects exhausted capacity", async () => {
  let release!: (claims: ClaimedEventDelivery[]) => void;
  const pending = new Promise<ClaimedEventDelivery[]>((resolve) => {
    release = resolve;
  });
  setDurabilityClient(fakeClient(() => pending));
  let active = 0;
  let starts = 0;
  const loop = new EventDeliveryPollLoop(
    "poll-worker",
    options(),
    () => active,
    () => {
      starts++;
      active = 1;
    },
  );
  loop.start();
  loop.wake();
  release([{} as ClaimedEventDelivery]);
  await waitUntil(() => starts === 1);
  await Bun.sleep(5);
  await loop.stop();
  expect({ starts, active }).toEqual({ starts: 1, active: 1 });
  loop.wake();
});

test("poll failures retry and stop safely", async () => {
  let calls = 0;
  setDurabilityClient(
    fakeClient(async () => {
      calls++;
      throw new Error("poll failed");
    }),
  );
  const loop = new EventDeliveryPollLoop(
    "failed-poll",
    options(),
    () => 0,
    () => {},
  );
  loop.start();
  await waitUntil(() => calls > 1);
  await loop.stop();
  expect(calls).toBeGreaterThan(1);
});

function options() {
  return resolveEventWorkerOptions({
    consumers: [{ event: "loop.event", consumer: "consumer" }],
    concurrency: 1,
    pollIntervalMs: 2,
    retryIntervalMs: 2,
  });
}

function fakeClient(
  transaction: () => Promise<ClaimedEventDelivery[]>,
): DurabilityClient {
  return {
    query: async () => ({ rows: [], rowCount: 0 }),
    pool: {} as DurabilityClient["pool"],
    transaction,
  } as DurabilityClient;
}
