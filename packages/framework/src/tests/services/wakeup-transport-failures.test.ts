import { afterEach, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  createDurabilityClient,
  setDurabilityClient,
} from "@damatjs/durability";
import type {
  AccelerationMode,
  DurabilityCoordinator,
} from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import { WorkerWakeupTransport } from "../../services/initialize/wakeupTransport";
import { FakeWakeupRedis } from "./wakeup-transport-fixture";

afterEach(clearDurabilityClient);
const logger = { warn: () => {}, info: () => {} } as never;

test("publisher and liveness failures disable acceleration", async () => {
  setFakeDurability();
  const redis = new FakeWakeupRedis();
  const coordinator = localCoordinator();
  let connected!: () => void;
  const ready = new Promise<void>((resolve) => void (connected = resolve));
  let degraded = 0;
  const transport = new WorkerWakeupTransport(
    redis as unknown as Redis,
    coordinator,
    { job: { id: "job", inFlight: 0, wake: () => {} } },
    logger,
    10_000,
    async () => connected(),
    () => degraded++,
  );
  transport.start();
  await ready;
  redis.publishError = new Error("publisher offline");
  await transportPublisher(transport).publish("damat:jobs:wakeup", "{}");
  expect(coordinator.mode).toBe("degraded");
  expect(degraded).toBe(1);
  await transport.stop();

  const livenessRedis = new FakeWakeupRedis();
  livenessRedis.setError = new Error("liveness offline");
  const liveness = new WorkerWakeupTransport(
    livenessRedis as unknown as Redis,
    coordinator,
    { job: { id: "job", inFlight: 0, wake: () => {} } },
    logger,
    6,
    undefined,
    () => degraded++,
  );
  liveness.start();
  while (degraded < 2) await Bun.sleep(1);
  await liveness.stop();
});

function setFakeDurability(): void {
  const query = async () => ({ rows: [], rowCount: 1 });
  setDurabilityClient(
    createDurabilityClient({
      pool: { query, connect: async () => ({ query, release: () => {} }) },
    }),
  );
}

function localCoordinator(): DurabilityCoordinator {
  let mode: AccelerationMode = "degraded";
  return {
    get mode() {
      return mode;
    },
    setMode: (value) => void (mode = value),
    pollInterval: (fallback) =>
      mode === "healthy" ? 30_000 : Math.min(fallback, 5_000),
    run: (_key, operation) => operation(),
  };
}

function transportPublisher(transport: WorkerWakeupTransport) {
  return (
    transport as unknown as {
      lifecycle: {
        publishers: {
          publisher: {
            publish(channel: string, message: string): Promise<number>;
          };
        };
      };
    }
  ).lifecycle.publishers.publisher;
}
