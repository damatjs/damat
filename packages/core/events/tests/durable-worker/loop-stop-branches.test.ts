import { afterEach, expect, test } from "bun:test";
import {
  setDurabilityClient,
  type DurabilityClient,
} from "@damatjs/durability";
import { EventDeliveryPollLoop } from "../../src/durable/worker/poll-loop";
import { EventWorkerReconcilerLoop } from "../../src/durable/worker/reconciler-loop";
import { EventWorkerRegistryLoop } from "../../src/durable/worker/registry-loop";
import { resolveEventWorkerOptions } from "../../src/durable/worker/runtime-options";
import { durability } from "./context";

afterEach(() => setDurabilityClient(durability));

test("loop stops absorb their current rejected operations", async () => {
  const controls = deferred();
  setDurabilityClient({
    ...durability,
    query: () => controls.query,
    transaction: () => controls.transaction,
  } as DurabilityClient);
  const options = resolveEventWorkerOptions({
    consumers: [{ event: "stop.event", consumer: "consumer" }],
  });
  const poll = new EventDeliveryPollLoop(
    "poll",
    options,
    () => 0,
    () => {},
  );
  const registry = new EventWorkerRegistryLoop("registry", options, () => 0);
  const reconciler = new EventWorkerReconcilerLoop("reconciler", options);
  poll.start();
  registry.start();
  reconciler.start();
  await Bun.sleep(0);
  const stopping = Promise.all([
    poll.stop(),
    registry.stop(),
    reconciler.stop(),
  ]);
  controls.reject(new Error("stopped operation"));
  await expect(stopping).resolves.toHaveLength(3);
});

function deferred() {
  let reject!: (error: Error) => void;
  const operation = new Promise<never>(
    (_resolve, value) => void (reject = value),
  );
  return { query: operation, transaction: operation, reject };
}
