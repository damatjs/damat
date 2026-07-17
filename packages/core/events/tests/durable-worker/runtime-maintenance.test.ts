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

test("ordinary idle keeps maintenance running", async () => {
  const item = await seedDelivery();
  const worker = createWorker(item);
  worker.start();
  await waitUntil(
    async () => (await deliveryRow(item.id)).status === "succeeded",
  );
  await waitUntil(async () => (await record(worker.id))?.inFlight === 0);
  const idleAt = (await record(worker.id))!.lastHeartbeatAt;
  await waitUntil(
    async () =>
      (await record(worker.id))!.lastHeartbeatAt.getTime() > idleAt.getTime(),
  );
  await worker.stop();
  const stoppedAt = (await record(worker.id))!.lastHeartbeatAt;
  await Bun.sleep(25);
  expect((await record(worker.id))!.lastHeartbeatAt.getTime()).toBe(
    stoppedAt.getTime(),
  );
});

test("drain keeps maintenance active until before stopped", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const item = await seedDelivery({ handler: async () => gate });
  const worker = createWorker(item);
  worker.start();
  await waitUntil(
    async () => (await deliveryRow(item.id)).status === "running",
  );
  const stopping = worker.stop({ graceMs: 2_000 });
  await waitUntil(async () => (await record(worker.id))?.state === "stopping");
  const drainingAt = (await record(worker.id))!.lastHeartbeatAt;
  await waitUntil(
    async () =>
      (await record(worker.id))!.lastHeartbeatAt.getTime() >
      drainingAt.getTime(),
  );
  release();
  await stopping;
  expect((await record(worker.id))?.state).toBe("stopped");
  const stoppedAt = (await record(worker.id))!.lastHeartbeatAt;
  await Bun.sleep(25);
  expect((await record(worker.id))!.lastHeartbeatAt.getTime()).toBe(
    stoppedAt.getTime(),
  );
});

function createWorker(item: Awaited<ReturnType<typeof seedDelivery>>) {
  return new DurableEventWorker({
    consumers: [{ event: item.event, consumer: item.consumer }],
    pollIntervalMs: 10,
    registryHeartbeatIntervalMs: 5,
    reconcileIntervalMs: 20,
  });
}

async function record(id: string) {
  return (await listWorkers({ ids: [id] }))[0];
}
