import { afterEach, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  createDurabilityClient,
  ProcessDurabilityCoordinator,
  setDurabilityClient,
} from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import { WorkerWakeupTransport } from "../../services/initialize/wakeupTransport";
import { FakeWakeupRedis } from "./wakeup-transport-fixture";

const warnings: string[] = [];
const logger = {
  warn: (message: string) => warnings.push(message),
  info: () => {},
} as never;

afterEach(() => {
  clearDurabilityClient();
  warnings.length = 0;
});

function setFakeDurability(): void {
  const query = async () => ({ rows: [], rowCount: 1 });
  setDurabilityClient(
    createDurabilityClient({
      pool: {
        query,
        connect: async () => ({ query, release: () => {} }),
      },
    }),
  );
}

test("one subscriber multiplexes job and event wakeups", async () => {
  setFakeDurability();
  const redis = new FakeWakeupRedis();
  const coordinator = new ProcessDurabilityCoordinator({ mode: "degraded" });
  const wakes: string[] = [];
  let ready!: () => void;
  const connected = new Promise<void>((resolve) => void (ready = resolve));
  const transport = new WorkerWakeupTransport(
    redis as unknown as Redis,
    coordinator,
    {
      job: { id: "job", inFlight: 0, wake: () => wakes.push("job") },
      router: { wake: () => wakes.push("router") },
      event: { id: "event", inFlight: 0, wake: () => wakes.push("event") },
    },
    logger,
    10_000,
    async () => ready(),
  );
  transport.start();
  await connected;
  await Bun.sleep(0);
  redis.emit("damat:jobs:wakeup", { kind: "jobs", queue: "default" });
  redis.emit("damat:events:wakeup", { kind: "events", target: "router" });
  redis.emit("damat:events:wakeup", {
    kind: "events",
    target: "delivery",
    event: "mail.sent",
    consumer: "audit",
  });
  expect(redis.duplicates).toBe(1);
  expect(wakes).toEqual(["job", "router", "event"]);
  expect(coordinator.mode).toBe("healthy");
  await transport.stop();
});

test("permission failure warns once and keeps degraded polling", async () => {
  setFakeDurability();
  const redis = new FakeWakeupRedis();
  redis.subscribeError = new Error("NOPERM No permissions to access a channel");
  const coordinator = new ProcessDurabilityCoordinator({ mode: "degraded" });
  const transport = new WorkerWakeupTransport(
    redis as unknown as Redis,
    coordinator,
    {},
    logger,
  );
  transport.start();
  await Bun.sleep(5);
  expect(warnings).toEqual(["Durability Redis acceleration unavailable"]);
  expect(coordinator.mode).toBe("degraded");
  expect(coordinator.pollInterval(30_000)).toBe(5_000);
  await transport.stop();
});
