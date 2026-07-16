import { beforeAll, expect, test } from "bun:test";
import { createJobSchedule } from "../../src/schedules";
import { reconcileJobSchedules } from "../../src/worker/reconcileSchedules";
import { pool, prepareSchedules, scheduleInput } from "./context";

beforeAll(prepareSchedules);

test("schedule deduplication TTL suppresses overlapping interval runs", async () => {
  const input = scheduleInput("interval");
  const schedule = await createJobSchedule({
    ...input,
    schedule: {
      kind: "interval",
      everyMs: 1,
      startsAt: new Date(Date.now() - 10),
    },
    deduplication: { key: crypto.randomUUID(), ttlMs: 60_000 },
  });
  await reconcileJobSchedules({ limit: 100 });
  await reconcileJobSchedules({ limit: 100 });
  const suppressed = await pool.query(
    `SELECT 1 FROM "_damat_job_runs" WHERE "schedule_id"=$1`,
    [schedule.id],
  );
  expect(suppressed.rowCount).toBe(1);

  await pool.query(
    `UPDATE "_damat_job_deduplication" SET "expires_at"=NOW()-INTERVAL '1 second'
     WHERE "run_id" IN (SELECT "id" FROM "_damat_job_runs" WHERE "schedule_id"=$1)`,
    [schedule.id],
  );
  await reconcileJobSchedules({ limit: 100 });
  const released = await pool.query(
    `SELECT 1 FROM "_damat_job_runs" WHERE "schedule_id"=$1`,
    [schedule.id],
  );
  expect(released.rowCount).toBe(2);
});
