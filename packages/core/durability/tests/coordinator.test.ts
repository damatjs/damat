import { expect, test } from "bun:test";
import { ProcessDurabilityCoordinator } from "../src";

test("coordinator switches between healthy and degraded polling", () => {
  const coordinator = new ProcessDurabilityCoordinator({
    mode: "degraded",
    healthySafetyPollIntervalMs: 30_000,
    degradedMaxPollIntervalMs: 5_000,
  });
  expect(coordinator.mode).toBe("degraded");
  expect(coordinator.pollInterval(1_000)).toBe(1_000);
  expect(coordinator.pollInterval(30_000)).toBe(5_000);
  coordinator.setMode("healthy");
  expect(coordinator.pollInterval(1_000)).toBe(30_000);
});

test("coordinator rejects invalid polling intervals", () => {
  expect(() => new ProcessDurabilityCoordinator({
    healthySafetyPollIntervalMs: 0,
  })).toThrow("positive safe integer");
  expect(() => new ProcessDurabilityCoordinator({
    degradedMaxPollIntervalMs: Number.NaN,
  })).toThrow("positive safe integer");
});

test("coordinator serializes unrelated background operations", async () => {
  const coordinator = new ProcessDurabilityCoordinator();
  const order: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => void (release = resolve));
  const first = coordinator.run("jobs", async () => {
    order.push("jobs:start");
    await gate;
    order.push("jobs:end");
  });
  const second = coordinator.run("events", async () => {
    order.push("events");
  });
  await Bun.sleep(0);
  expect(order).toEqual(["jobs:start"]);
  release();
  await Promise.all([first, second]);
  expect(order).toEqual(["jobs:start", "jobs:end", "events"]);
});

test("coordinator coalesces duplicate background keys", async () => {
  const coordinator = new ProcessDurabilityCoordinator();
  let calls = 0;
  const operation = () => coordinator.run("shared", async () => ++calls);
  expect(await Promise.all([operation(), operation()])).toEqual([1, 1]);
  expect(calls).toBe(1);
});

test("coordinator continues after a background operation rejects", async () => {
  const coordinator = new ProcessDurabilityCoordinator();
  await expect(coordinator.run("failed", async () => {
    throw new Error("failed operation");
  })).rejects.toThrow("failed operation");
  expect(await coordinator.run("next", async () => 2)).toBe(2);
});
