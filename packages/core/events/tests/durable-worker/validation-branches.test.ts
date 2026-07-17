import { expect, test } from "bun:test";
import {
  claimEventDeliveries,
  DurableEventWorker,
  heartbeatEventDelivery,
  reconcileExpiredEventDeliveryLeases,
  routeDurableEvents,
  runEventRetention,
  type ClaimedEventDelivery,
} from "../../src";

const consumers = [{ event: "validation.event", consumer: "consumer" }];

test("claim validates exact identities before touching storage", async () => {
  const options = {
    consumers,
    workerId: "worker",
    limit: 1,
    leaseMs: 1,
  };
  await expect(
    claimEventDeliveries({
      consumers: [{ event: "", consumer: "consumer" }],
      workerId: "worker",
      limit: 1,
      leaseMs: 1,
    }),
  ).rejects.toThrow(/identities/);
  await expect(
    claimEventDeliveries({ ...options, workerId: " " }),
  ).rejects.toThrow(/workerId/);
  await expect(claimEventDeliveries({ ...options, limit: 0 })).rejects.toThrow(
    /limit/,
  );
  await expect(
    claimEventDeliveries({ ...options, leaseMs: 0 }),
  ).rejects.toThrow(/leaseMs/);
  await expect(routeDurableEvents({ limit: 0 })).rejects.toThrow(/route limit/);
  await expect(
    reconcileExpiredEventDeliveryLeases({ limit: 0 }),
  ).rejects.toThrow(/reconcile limit/);
  await expect(
    heartbeatEventDelivery({} as ClaimedEventDelivery, { leaseMs: 0 }),
  ).rejects.toThrow(/leaseMs/);
});

test("worker validates identity, numeric, and stop inputs", async () => {
  expect(
    () =>
      new DurableEventWorker(
        {} as ConstructorParameters<typeof DurableEventWorker>[0],
      ),
  ).toThrow(/consumer/i);
  expect(() => new DurableEventWorker({ consumers, workerId: " " })).toThrow(
    /workerId/,
  );
  expect(() => new DurableEventWorker({ consumers, concurrency: 0 })).toThrow(
    /concurrency/,
  );
  expect(() => new DurableEventWorker({ consumers, concurrency: 1.5 })).toThrow(
    /concurrency/,
  );
  expect(
    () =>
      new DurableEventWorker({
        consumers: [{ event: "", consumer: "consumer" }],
      }),
  ).toThrow(/cannot be empty/);
  expect(
    () =>
      new DurableEventWorker({
        consumers,
        registryHeartbeatIntervalMs: 25_001,
      }),
  ).toThrow(/25000/);
  const worker = new DurableEventWorker({ consumers });
  expect(worker.isRunning).toBe(false);
  expect(() => worker.stop({ graceMs: -1 })).toThrow(/graceMs/);
  await worker.stop();
});

test("retention rejects invalid actors before storage", async () => {
  await expect(
    runEventRetention({ actor: { id: "", type: "system" } }),
  ).rejects.toThrow(/actor id/);
  await expect(
    runEventRetention({
      actor: { id: "actor", type: "invalid" as "system" },
    }),
  ).rejects.toThrow(/actor type/);
});
