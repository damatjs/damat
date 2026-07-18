import { expect, test } from "bun:test";
import type { DurabilityCoordinator } from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import { probeAccelerationPublish } from "../../services/initialize/accelerationProbe";
import { persistAccelerationMode } from "../../services/initialize/accelerationState";
import { warnAccelerationUnavailable } from "../../services/initialize/accelerationWarning";
import { WakeupPublisherGate } from "../../services/initialize/wakeupPublisherGate";
import { WorkerLiveness } from "../../services/initialize/workerLiveness";
import { WorkerWakeupSubscriber } from "../../services/initialize/wakeupSubscriber";

const coordinator: DurabilityCoordinator = {
  mode: "degraded", setMode: () => {}, pollInterval: () => 5_000,
  run: (_key, operation) => operation(),
};

test("probe, publisher gate, state persistence, and warnings degrade safely", async () => {
  const failures: unknown[] = [];
  const redis = { publish: async () => { throw new Error("offline"); } } as unknown as Redis;
  await expect(probeAccelerationPublish(redis)).rejects.toThrow("PUBLISH");
  const gate = new WakeupPublisherGate(redis, async (error) => void failures.push(error));
  gate.enable();
  const result = await publisher(gate).publish("damat:jobs:wakeup", "{}");
  gate.disable();
  expect(result).toBe(0);
  expect(failures).toHaveLength(1);
  await expect(persistAccelerationMode(coordinator, "degraded", async () => {
    throw new Error("database unavailable");
  })).resolves.toBeUndefined();
  const details: unknown[] = [];
  const logger = { warn: (_message: string, value: unknown) => details.push(value) } as never;
  warnAccelerationUnavailable(logger, new Error("PUBLISH denied"), 5_000, "redisUser");
  warnAccelerationUnavailable(logger, "offline", 5_000, "redisUser");
  expect(details).toMatchObject([
    { deniedCapability: "PUBLISH" },
    { deniedCapability: "Redis coordination" },
  ]);
});

test("subscriber cleanup absorbs Redis close failures", async () => {
  const subscriber = {
    on: () => {}, off: () => {}, subscribe: async () => 2,
    unsubscribe: async () => { throw new Error("unsubscribe"); },
    quit: async () => { throw new Error("quit"); },
  };
  const client = { duplicate: () => subscriber } as unknown as Redis;
  const wakeups = new WorkerWakeupSubscriber(client, {});
  await wakeups.close();
  await wakeups.connect();
  await expect(wakeups.close()).resolves.toBeUndefined();
});

test("worker liveness refreshes, reports failure, and removes keys", async () => {
  const writes: string[] = [];
  const errors: unknown[] = [];
  const redis = {
    set: async (key: string) => void writes.push(key),
    del: async () => { throw new Error("delete failed"); },
  } as unknown as Redis;
  const liveness = new WorkerLiveness(redis, [{ id: "worker", inFlight: 2 }], 6,
    (error) => errors.push(error));
  liveness.start();
  while (writes.length < 2) await Bun.sleep(1);
  await liveness.stop();
  await refresh(liveness);
  expect(writes).toEqual(["damat:workers:worker", "damat:workers:worker"]);
  const failing = new WorkerLiveness({
    set: async () => { throw new Error("write failed"); }, del: async () => 1,
  } as unknown as Redis, [{ id: "bad", inFlight: 0 }], 6, (error) => errors.push(error));
  failing.start();
  while (!errors.length) await Bun.sleep(1);
  await failing.stop();
  expect(errors).toHaveLength(1);
});

const publisher = (gate: WakeupPublisherGate) =>
  (gate as unknown as { publisher: { publish(channel: string, message: string): Promise<number> } }).publisher;
const refresh = (value: WorkerLiveness) =>
  (value as unknown as { refresh(): Promise<void> }).refresh();
