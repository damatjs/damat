import { beforeEach, expect, test } from "bun:test";
import { listWorkers } from "@damatjs/durability";
import { clearDurableEventDefinitions, DurableEventWorker } from "../../src";
import { resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";
import { waitUntil } from "./wait";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("timed-out non-cooperative shutdown quiesces maintenance", async () => {
  const item = await seedDelivery({
    handler: async () => new Promise<void>(() => {}),
  });
  const worker = new DurableEventWorker({
    consumers: [{ event: item.event, consumer: item.consumer }],
    pollIntervalMs: 10,
    leaseMs: 1_000,
    heartbeatIntervalMs: 5,
    reconcileIntervalMs: 1_000,
    registryHeartbeatIntervalMs: 5,
  });
  worker.start();
  await waitUntil(
    async () => (await deliveryRow(item.id)).status === "running",
  );
  await worker.stop({ graceMs: 10 });
  const stoppedHeartbeat = (await record(worker.id)).lastHeartbeatAt;
  await Bun.sleep(30);
  expect((await record(worker.id)).lastHeartbeatAt.getTime()).toBe(
    stoppedHeartbeat.getTime(),
  );
  expect(await deliveryRow(item.id)).toMatchObject({
    status: "running",
    cancellation_requested_at: null,
  });
});

async function record(id: string) {
  return (await listWorkers({ ids: [id] }))[0]!;
}
