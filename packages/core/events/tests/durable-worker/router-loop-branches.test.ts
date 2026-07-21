import { afterEach, expect, test } from "bun:test";
import {
  setDurabilityClient,
  type DurabilityClient,
} from "@damatjs/durability";
import { DurableEventRouter } from "../../src";
import { durability } from "./context";
import { waitUntil } from "./wait";

afterEach(() => setDurabilityClient(durability));

test("router failures retry and stop safely", async () => {
  let calls = 0;
  const client: DurabilityClient = {
    ...durability,
    transaction: async () => {
      calls++;
      throw new Error("router failed");
    },
  };
  setDurabilityClient(client);
  const router = new DurableEventRouter({
    pollIntervalMs: 2,
    retryIntervalMs: 2,
  });
  router.start();
  await waitUntil(() => calls > 1);
  await router.stop();
  expect(calls).toBeGreaterThan(1);
});
