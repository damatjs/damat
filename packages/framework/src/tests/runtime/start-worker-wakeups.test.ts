import { afterEach, expect, test } from "bun:test";
import {
  clearAccelerationController,
  clearDurabilityClient,
  ProcessDurabilityCoordinator,
} from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import {
  redisUsername,
  startWorkerWakeups,
} from "../../runtime/startWorkerWakeups";
import { FakeWakeupRedis } from "../services/wakeup-transport-fixture";
import {
  config,
  logger,
  setFakeDurability,
  waitFor,
} from "./start-worker-wakeups-fixture";

afterEach(() => {
  clearAccelerationController();
  clearDurabilityClient();
});

test("worker wakeups rebuild acceleration and clear it on shutdown", async () => {
  setFakeDurability();
  const redis = new FakeWakeupRedis();
  const coordinator = new ProcessDurabilityCoordinator({ mode: "degraded" });
  const instances = {
    shutdownHandlers: [],
    durabilityCoordinator: coordinator,
  };
  startWorkerWakeups(
    config("redis://redisUsername@localhost"),
    instances,
    logger(),
    {},
    redis as unknown as Redis,
  );
  await waitFor(() => coordinator.mode === "healthy");
  expect(instances.shutdownHandlers).toHaveLength(1);
  await instances.shutdownHandlers[0]!.handler();
  expect(coordinator.mode).toBe("disabled");
});

test("relay failure degrades transport and reports an invalid Redis user", async () => {
  setFakeDurability(true);
  const redis = new FakeWakeupRedis();
  const coordinator = new ProcessDurabilityCoordinator({ mode: "degraded" });
  const warnings: unknown[] = [];
  const instances = {
    shutdownHandlers: [],
    durabilityCoordinator: coordinator,
  };
  startWorkerWakeups(
    config("not a redis url"),
    instances,
    logger(warnings),
    {},
    redis as unknown as Redis,
  );
  await waitFor(() => warnings.length > 0);
  expect(warnings[0]).toMatchObject({ redisUser: "unknown" });
  await instances.shutdownHandlers[0]!.handler();
});

test("Redis usernames decode and default predictably", () => {
  expect(redisUsername("redis://named%20user@localhost")).toBe("named user");
  expect(redisUsername("redis://localhost")).toBe("default");
  expect(redisUsername("invalid")).toBe("unknown");
});
