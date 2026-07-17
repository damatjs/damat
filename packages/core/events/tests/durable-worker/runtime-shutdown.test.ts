import { beforeEach, expect, test } from "bun:test";
import { clearDurableEventDefinitions, DurableEventWorker } from "../../src";
import { listWorkers } from "@damatjs/durability";
import { resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";
import { waitUntil } from "./wait";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("graceful stop drains before persisting stopped", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const item = await seedDelivery({ handler: async () => gate });
  const worker = createWorker(item);
  worker.start();
  await waitUntil(
    async () => (await deliveryRow(item.id)).status === "running",
  );
  const stopping = worker.stop({ graceMs: 2_000 });
  await waitUntil(
    async () =>
      (await listWorkers({ ids: [worker.id] }))[0]?.state === "stopping",
  );
  release();
  await stopping;
  expect((await deliveryRow(item.id)).status).toBe("succeeded");
  expect((await listWorkers({ ids: [worker.id] }))[0]?.state).toBe("stopped");
});

test("shutdown timeout abort leaves lease recoverable, not cancelled", async () => {
  const item = await seedDelivery({
    handler: async (_payload, context) =>
      new Promise<void>((resolve) =>
        context.signal.addEventListener("abort", () => resolve(), {
          once: true,
        }),
      ),
  });
  const worker = createWorker(item);
  worker.start();
  await waitUntil(
    async () => (await deliveryRow(item.id)).status === "running",
  );
  await worker.stop({ graceMs: 10 });
  expect(await deliveryRow(item.id)).toMatchObject({
    status: "running",
    cancellation_requested_at: null,
  });
});

function createWorker(item: Awaited<ReturnType<typeof seedDelivery>>) {
  return new DurableEventWorker({
    consumers: [{ event: item.event, consumer: item.consumer }],
    pollIntervalMs: 10,
    retryIntervalMs: 10,
    reconcileIntervalMs: 1_000,
    registryHeartbeatIntervalMs: 10,
  });
}
