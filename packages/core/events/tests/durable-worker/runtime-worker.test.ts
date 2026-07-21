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

test("worker polls, executes, registers load, and stops", async () => {
  const item = await seedDelivery();
  const worker = new DurableEventWorker({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: `event-worker-${crypto.randomUUID()}`,
    pollIntervalMs: 10,
    retryIntervalMs: 10,
    reconcileIntervalMs: 20,
    registryHeartbeatIntervalMs: 10,
  });
  worker.start();
  worker.start();
  await waitUntil(
    async () => (await deliveryRow(item.id)).status === "succeeded",
  );
  await waitUntil(
    async () => (await listWorkers({ ids: [worker.id] }))[0]?.inFlight === 0,
  );
  const record = (await listWorkers({ ids: [worker.id] }))[0]!;
  expect(record.capabilities[0]).toContain("events:");
  expect(record.inFlight).toBe(0);
  await worker.stop();
  expect((await listWorkers({ ids: [worker.id] }))[0]?.state).toBe("stopped");
  expect(() => worker.start()).toThrow(/cannot restart/);
});

test("worker validates heartbeat and exact consumer options", () => {
  expect(() => new DurableEventWorker({ consumers: [] })).toThrow(/consumer/i);
  expect(
    () =>
      new DurableEventWorker({
        consumers: [{ event: "x", consumer: "y" }],
        leaseMs: 10,
        heartbeatIntervalMs: 10,
      }),
  ).toThrow(/heartbeatIntervalMs/);
});

test("worker rejects timer overflow instead of creating a hot loop", () => {
  const consumers = [{ event: "x", consumer: "y" }];
  const overflow = 2_147_483_648;
  expect(
    () => new DurableEventWorker({ consumers, pollIntervalMs: overflow }),
  ).toThrow(/pollIntervalMs/);
  expect(
    () => new DurableEventWorker({ consumers, retryIntervalMs: overflow }),
  ).toThrow(/retryIntervalMs/);
  expect(
    () => new DurableEventWorker({ consumers, reconcileIntervalMs: overflow }),
  ).toThrow(/reconcileIntervalMs/);
  expect(
    () => new DurableEventWorker({ consumers, retentionIntervalMs: overflow }),
  ).toThrow(/retentionIntervalMs/);
});
