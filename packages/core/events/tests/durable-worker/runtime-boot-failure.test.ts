import { expect, test } from "bun:test";
import {
  setDurabilityClient,
  type DurabilityClient,
} from "@damatjs/durability";
import { DurableEventWorker } from "../../src";
import { durability } from "./context";
import { waitUntil } from "./wait";

test("worker boot failure becomes stopped without starting loops", async () => {
  const root = new Error("registration failed");
  const client: DurabilityClient = {
    ...durability,
    query: () => Promise.reject(root),
  };
  setDurabilityClient(client);
  const worker = new DurableEventWorker({
    consumers: [{ event: "boot.failure", consumer: "consumer" }],
  });
  try {
    worker.start();
    await waitUntil(() => !worker.isRunning);
  } finally {
    setDurabilityClient(durability);
  }
  expect(worker.isRunning).toBe(false);
  await worker.stop();
  expect(worker.isRunning).toBe(false);
});
