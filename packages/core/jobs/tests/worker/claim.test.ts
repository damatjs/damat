import { beforeEach, expect, test } from "bun:test";
import { pauseWork } from "@damatjs/durability";
import { claimJobRuns } from "../../src/worker/claim";
import { prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

test("concurrent workers claim disjoint due rows", async () => {
  const queue = crypto.randomUUID();
  const first = await queuedRun(queue);
  const second = await queuedRun(queue);
  const [left, right] = await Promise.all([
    claimJobRuns({ queue, workerId: "worker-a", limit: 1, leaseMs: 30_000 }),
    claimJobRuns({ queue, workerId: "worker-b", limit: 1, leaseMs: 30_000 }),
  ]);
  expect(left).toHaveLength(1);
  expect(right).toHaveLength(1);
  expect(new Set([left[0]!.id, right[0]!.id])).toEqual(
    new Set([first.run.id, second.run.id]),
  );
});

test("claim orders due time before priority", async () => {
  const queue = crypto.randomUUID();
  const earlier = await queuedRun(queue, { priority: 100 });
  const later = await queuedRun(queue, { delayMs: 25, priority: 1 });
  await Bun.sleep(35);
  const claims = await claimJobRuns({
    queue,
    workerId: "worker-order",
    limit: 2,
    leaseMs: 30_000,
  });
  expect(claims.map(({ id }) => id)).toEqual([earlier.run.id, later.run.id]);
});

test("paused queues produce no claims", async () => {
  const queue = crypto.randomUUID();
  await queuedRun(queue);
  await pauseWork({
    kind: "job",
    scope: queue,
    actor: { id: "test", type: "system" },
  });
  expect(
    await claimJobRuns({
      queue,
      workerId: "worker-paused",
      limit: 1,
      leaseMs: 30_000,
    }),
  ).toEqual([]);
});
