import { expect, test } from "bun:test";
import type { AccelerationSignal } from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import { publishAccelerationSignal } from "../../services/initialize/accelerationPublish";

test("inspection invalidations never publish canonical payload data", async () => {
  const publications: Array<[string, string]> = [];
  const ready: unknown[][] = [];
  const redis = {
    publish: async (channel: string, message: string) => {
      publications.push([channel, message]);
      return 1;
    },
    zadd: async (...args: unknown[]) => void ready.push(args),
  } as unknown as Redis;
  const signal: AccelerationSignal = {
    id: crypto.randomUUID(),
    revision: "42",
    topic: "damat:jobs:wakeup",
    kind: "job",
    resourceId: "run-1",
    scope: "reports",
    payload: { kind: "jobs", queue: "reports", secret: "never-forward" },
    availableAt: new Date(1_000),
    claimToken: crypto.randomUUID(),
  };
  await publishAccelerationSignal(redis, signal);
  expect(ready).toEqual([["damat:ready:jobs:reports", 1_000, "run-1"]]);
  const invalidation = publications.find(([channel]) =>
    channel === "damat:inspection:invalidate"
  );
  expect(JSON.parse(invalidation![1])).toEqual({
    kind: "job",
    resourceId: "run-1",
    scope: "reports",
    revision: "42",
  });
});

test("event ready indexes distinguish router, delivery, and invalidation only", async () => {
  const publications: string[] = [];
  const ready: unknown[][] = [];
  const redis = {
    publish: async (channel: string) => (publications.push(channel), 1),
    zadd: async (...args: unknown[]) => void ready.push(args),
  } as unknown as Redis;
  const base = {
    id: crypto.randomUUID(), revision: "8", kind: "event" as const,
    payload: {}, availableAt: new Date(2_000), claimToken: crypto.randomUUID(),
  };
  await publishAccelerationSignal(redis, {
    ...base, topic: "damat:events:wakeup", resourceId: "route", scope: "router",
  });
  await publishAccelerationSignal(redis, {
    ...base, topic: "damat:events:wakeup", resourceId: "delivery",
  });
  await publishAccelerationSignal(redis, {
    ...base, topic: "damat:inspection:invalidate",
  });
  expect(ready).toEqual([
    ["damat:ready:events:router", 2_000, "route"],
    ["damat:ready:events:delivery:all", 2_000, "delivery"],
  ]);
  expect(publications.filter((channel) => channel === "damat:events:wakeup"))
    .toHaveLength(2);
  expect(publications.filter((channel) => channel === "damat:inspection:invalidate"))
    .toHaveLength(3);
});
