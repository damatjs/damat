import { expect, test } from "bun:test";
import {
  cancelJobRun,
  enqueueJob,
  listJobActivity,
  retryJobRun,
} from "../../src/client";
import { ensureStorage, pool, uniqueName } from "./context";

test("activity order follows immutable insertion identity", async () => {
  await ensureStorage();
  const run = await enqueueJob(uniqueName("activity-order"), {});
  await pool.query(
    `INSERT INTO "_damat_job_activity"
       ("run_id","type","previous_status","next_status","occurred_at")
     VALUES ($1,'manual','queued','queued',NOW() - INTERVAL '1 day')`,
    [run.id],
  );
  expect((await listJobActivity(run.id)).map(({ type }) => type)).toEqual([
    "enqueued",
    "manual",
  ]);
});

test("cancellation activity preserves retry-wait as prior status", async () => {
  await ensureStorage();
  const run = await enqueueJob(uniqueName("cancel-prior"), {});
  await pool.query(
    `UPDATE "_damat_job_runs" SET "status" = 'retry_wait' WHERE "id" = $1`,
    [run.id],
  );
  expect((await cancelJobRun(run.id))?.status).toBe("cancelled");
  const activity = await listJobActivity(run.id);
  expect(activity.at(-1)).toMatchObject({
    type: "cancelled",
    previousStatus: "retry_wait",
    nextStatus: "cancelled",
  });
});

test("running cancellation records a request without stealing the lease", async () => {
  await ensureStorage();
  const run = await enqueueJob(uniqueName("cancel-running"), {});
  await pool.query(
    `UPDATE "_damat_job_runs" SET "status" = 'running' WHERE "id" = $1`,
    [run.id],
  );
  const requested = await cancelJobRun(run.id);
  expect(requested?.status).toBe("running");
  expect(requested?.cancellationRequestedAt).toBeInstanceOf(Date);
  expect((await listJobActivity(run.id)).at(-1)).toMatchObject({
    type: "cancellation_requested",
    previousStatus: "running",
    nextStatus: "running",
  });
  const firstActivityCount = (await listJobActivity(run.id)).length;
  await Bun.sleep(10);
  const repeated = await cancelJobRun(run.id);
  expect(repeated?.cancellationRequestedAt).toEqual(
    requested?.cancellationRequestedAt,
  );
  expect(await listJobActivity(run.id)).toHaveLength(firstActivityCount);
});

test("manual retry returns a dead letter to queued state", async () => {
  await ensureStorage();
  const run = await enqueueJob(uniqueName("retry"), {});
  await pool.query(
    `UPDATE "_damat_job_runs" SET "status" = 'dead_lettered' WHERE "id" = $1`,
    [run.id],
  );
  expect((await retryJobRun(run.id))?.status).toBe("queued");
  expect((await listJobActivity(run.id)).at(-1)).toMatchObject({
    type: "manual_retry",
    previousStatus: "dead_lettered",
    nextStatus: "queued",
  });
});

test("cancel and retry reject non-transactional executors", async () => {
  const executor = { query: async () => ({ rows: [], rowCount: 0 }) };
  await expect(
    cancelJobRun(crypto.randomUUID(), { executor: executor as never }),
  ).rejects.toThrow(/transaction/i);
  await expect(
    retryJobRun(crypto.randomUUID(), { executor: executor as never }),
  ).rejects.toThrow(/transaction/i);
});
