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

test("one subscriber multiplexes job, event, and pipeline wakeups", async () => {
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
      pipeline: {
        router: { wake: () => wakes.push("pipeline-router") },
        worker: {
          id: "pipeline",
          inFlight: 0,
          wake: () => wakes.push("pipeline-worker"),
        },
        queue: "damat-pipelines",
      },
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
  redis.emit("damat:pipelines:wakeup", { kind: "pipelines", scope: "orders" });
  expect(redis.duplicates).toBe(1);
  expect(wakes).toEqual([
    "job",
    "pipeline-worker",
    "router",
    "pipeline-router",
    "event",
    "pipeline-router",
    "pipeline-router",
  ]);
  expect(coordinator.mode).toBe("healthy");
  redis.emitError(new Error("connection lost"));
  await Bun.sleep(0);
  expect(coordinator.mode).toBe("degraded");
  await transport.stop();
});
