import { beforeAll, expect, test } from "bun:test";
import { createJobSchedule } from "../../src/schedules";
import {
  ensureStorage,
  insertRun,
  inspection,
  pool,
  uniqueName,
} from "./context";

beforeAll(ensureStorage);

test("list applies lineage, timing, worker, and lease filters", async () => {
  const now = new Date();
  const schedule = await createJobSchedule({
    name: uniqueName("filter-schedule"),
    jobName: uniqueName("filter-job"),
    payload: {},
    schedule: { kind: "once", at: new Date(now.getTime() + 60_000) },
  });
  const run = await insertRun({ status: "running", createdAt: now });
  const worker = uniqueName("filter-worker");
  await pool.query(
    `UPDATE "_damat_job_runs" SET "started_at"=$2::timestamptz,
     "available_at"=$2::timestamptz,"lease_owner"=$3,"lease_token"=$4,
     "lease_expires_at"=$2::timestamptz+INTERVAL '1 hour',
     "correlation_id"='correlation-filter',"deduplication_key"='dedup-filter',
     "schedule_id"=$5,"scheduled_for"=$2 WHERE "id"=$1`,
    [run.id, now, worker, crypto.randomUUID(), schedule.id],
  );
  await pool.query(
    `INSERT INTO "_damat_job_activity" ("run_id","type","occurred_at")
     VALUES ($1,'retry_wait',$2),($1,'lease_recovered',$2)`,
    [run.id, now],
  );
  const range = {
    from: new Date(now.getTime() - 1_000),
    to: new Date(now.getTime() + 1_000),
  };
  const page = await inspection().listRuns({
    statuses: ["running"],
    views: ["processing"],
    recovered: true,
    queues: [run.queue],
    names: [run.name],
    workerIds: [worker],
    leaseState: "active",
    available: range,
    created: range,
    started: range,
    failed: range,
    correlationIds: ["correlation-filter"],
    scheduleIds: [schedule.id],
    deduplicationKeys: ["dedup-filter"],
  });
  expect(page.items.map(({ id }) => id)).toEqual([run.id]);
});

test("list filters terminal time and validates limits", async () => {
  const now = new Date();
  const run = await insertRun({ status: "cancelled", createdAt: now });
  await pool.query(
    `UPDATE "_damat_job_runs" SET "completed_at"=$2 WHERE "id"=$1`,
    [run.id, now],
  );
  const range = {
    from: new Date(now.getTime() - 1_000),
    to: new Date(now.getTime() + 1_000),
  };
  expect(
    (
      await inspection().listRuns({
        queues: [run.queue],
        views: ["completed"],
        leaseState: "none",
        finished: range,
      })
    ).items[0]?.id,
  ).toBe(run.id);
  await expect(inspection().listRuns({ limit: 0 })).rejects.toThrow(
    "between 1 and 500",
  );
  expect(
    (await inspection().listRuns({ queues: [], limit: 1 })).items,
  ).toHaveLength(1);
});
