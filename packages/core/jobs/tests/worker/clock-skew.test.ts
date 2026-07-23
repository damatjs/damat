import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test";
import { enqueueJob } from "../../src/client";
import { defineJob } from "../../src/definitions/registry";
import { claimJobRuns } from "../../src/worker/claim";
import { durability, uniqueName } from "../storage/context";
import { prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);
afterEach(() => setSystemTime());

test("relative enqueue delay uses the PostgreSQL clock", async () => {
  setSystemTime(Date.now() + 60_000);
  const item = await queuedRun();
  const [claimed] = await claimJobRuns({
    queue: item.queue,
    workerId: "clock-skew-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  expect(claimed?.id).toBe(item.run.id);
});

test("relative delay starts at its insert statement", async () => {
  await durability.transaction(async (executor) => {
    await executor.query("SELECT pg_sleep(0.2)");
    const result = await executor.query<{ now: Date }>(
      "SELECT clock_timestamp() AS now",
    );
    const name = uniqueName("statement-clock");
    defineJob(name, async () => {});
    const run = await enqueueJob(name, {}, { delayMs: 100, executor });
    const delay = run.availableAt.getTime() - result.rows[0]!.now.getTime();
    expect(delay).toBeGreaterThanOrEqual(90);
  });
});
