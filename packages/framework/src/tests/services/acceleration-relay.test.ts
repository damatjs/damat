import { expect, test } from "bun:test";
import type { Redis } from "@damatjs/redis";
import { AccelerationRelay } from "../../services/initialize/accelerationRelay";
import { coordinator, ops, signal } from "./acceleration-relay-fixture";

test("relay publishes, checkpoints, schedules, and rebuilds", async () => {
  const calls: string[] = [];
  let claims = 0;
  const operations = ops({
    claim: async () => (++claims === 1 ? [signal] : []),
    publish: async () => void calls.push("publish"),
    markPublished: async () => (calls.push("mark"), true),
    updateState: async () => void calls.push("state"),
    audit: async (_actor, status) => void calls.push(status),
    rebuild: async () => void calls.push("rebuild"),
  });
  const relay = new AccelerationRelay(
    {} as Redis,
    10,
    1,
    { jobs: true, events: true },
    coordinator,
    () => {},
    operations,
  );
  await relay.flush();
  relay.start();
  while (claims < 2) await Bun.sleep(1);
  relay.stop();
  await relay.rebuild({ id: "ops", type: "system", reason: "repair" });
  for (const call of [
    "publish",
    "mark",
    "state",
    "requested",
    "rebuild",
    "completed",
  ])
    expect(calls).toContain(call);
});

test("relay releases failed signals and audits rebuild failures", async () => {
  const errors: unknown[] = [];
  const audits: unknown[][] = [];
  const released: unknown[] = [];
  const operations = ops({
    claim: async () => [signal],
    publish: async () => {
      throw new Error("Redis offline");
    },
    release: async (_signal, error) => void released.push(error),
    audit: async (...args) => void audits.push(args),
    rebuild: async () => {
      throw "projection failed";
    },
  });
  const relay = new AccelerationRelay(
    {} as Redis,
    1,
    30_000,
    { jobs: true, events: true },
    coordinator,
    (error) => errors.push(error),
    operations,
  );
  relay.start();
  while (!errors.length) await Bun.sleep(1);
  relay.stop();
  await expect(
    relay.rebuild({ id: "ops", type: "system", reason: "repair" }),
  ).rejects.toBe("projection failed");
  expect(released).toHaveLength(1);
  expect(audits.map((args) => args[1])).toEqual(["requested", "failed"]);
  expect(audits[1]?.[2]).toEqual({ error: "projection failed" });
});
