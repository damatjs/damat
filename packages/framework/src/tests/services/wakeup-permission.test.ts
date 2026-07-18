import { afterEach, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  createDurabilityClient,
  setDurabilityClient,
  type AccelerationMode,
  type DurabilityCoordinator,
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

test("permission failure warns once and keeps degraded polling", async () => {
  const query = async () => ({ rows: [], rowCount: 1 });
  setDurabilityClient(
    createDurabilityClient({
      pool: { query, connect: async () => ({ query, release: () => {} }) },
    }),
  );
  const redis = new FakeWakeupRedis();
  redis.subscribeError = new Error("NOPERM No permissions to access a channel");
  const coordinator = localCoordinator();
  const transport = new WorkerWakeupTransport(
    redis as unknown as Redis,
    coordinator,
    { job: { id: "job", inFlight: 0, wake: () => {} } },
    logger,
  );
  transport.start();
  await Bun.sleep(5);
  expect(warnings).toEqual(["Durability Redis acceleration unavailable"]);
  expect(coordinator.mode).toBe("degraded");
  expect(coordinator.pollInterval(30_000)).toBe(5_000);
  await transport.stop();
});

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
