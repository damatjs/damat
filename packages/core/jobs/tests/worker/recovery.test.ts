import { beforeEach, expect, test } from "bun:test";
import { cancelJobRun, getJobRun, listJobAttempts } from "../../src/client";
import { claimJobRuns } from "../../src/worker/claim";
import { claimOne, expireLease, prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

test("expired final attempts dead-letter without exceeding max attempts", async () => {
  const item = await queuedRun(undefined, { maxAttempts: 1 });
  const [claimed] = await claimJobRuns({
    queue: item.queue,
    workerId: "worker-final",
    limit: 1,
    leaseMs: 30_000,
  });
  await expireLease(claimed!.id);
  expect(
    await claimJobRuns({
      queue: item.queue,
      workerId: "worker-next",
      limit: 1,
      leaseMs: 30_000,
    }),
  ).toEqual([]);
  expect(await getJobRun(item.run.id)).toMatchObject({
    status: "dead_lettered",
    attemptCount: 1,
  });
  expect(await listJobAttempts(item.run.id)).toMatchObject([
    { attemptNumber: 1, outcome: "lost" },
  ]);
});

test("expired cancellation requests settle without executing again", async () => {
  const claimed = await claimOne("worker-cancel-source");
  await cancelJobRun(claimed.id);
  await expireLease(claimed.id);
  expect(
    await claimJobRuns({
      queue: claimed.queue,
      workerId: "worker-cancelled",
      limit: 1,
      leaseMs: 30_000,
    }),
  ).toEqual([]);
  expect(await getJobRun(claimed.id)).toMatchObject({
    status: "cancelled",
    attemptCount: 1,
  });
});
