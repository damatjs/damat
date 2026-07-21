import { beforeAll, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

test("waiting duration excludes intentional availability delay", async () => {
  const from = new Date("2050-01-01T00:00:00Z");
  const to = new Date("2050-01-01T01:00:00Z");
  await pool.query(
    `DELETE FROM "_damat_job_runs" WHERE "created_at">=$1 AND "created_at"<$2`,
    [from, to],
  );
  const run = await insertRun({ status: "succeeded", createdAt: from });
  await pool.query(
    `UPDATE "_damat_job_runs"
     SET "available_at"=$2::timestamptz+INTERVAL '20 minutes',
       "started_at"=$2::timestamptz+INTERVAL '21 minutes',
       "completed_at"=$2::timestamptz+INTERVAL '22 minutes'
     WHERE "id"=$1`,
    [run.id, from],
  );
  await insertAttempt(run.id, new Date(from.getTime() + 1_260_000), 60_000);
  await pool.query(
    `INSERT INTO "_damat_job_attempts"
       ("run_id","attempt_number","worker_id","lease_token","started_at")
     VALUES ($1,2,'legacy-wait',$2,$3)`,
    [run.id, crypto.randomUUID(), new Date(from.getTime() + 1_300_000)],
  );
  const result = await inspection().getSummary({
    from,
    to,
    intervalMs: 60_000,
    now: to,
  });
  expect(result.waitingDuration).toMatchObject({ count: 1, maxMs: 60_000 });
});

test("waiting duration is attributed by half-open start time", async () => {
  const from = new Date("2053-01-01T00:00:00Z");
  const to = new Date("2053-01-01T01:00:00Z");
  await pool.query(
    `DELETE FROM "_damat_job_runs"
     WHERE "created_at">=$1::timestamptz-INTERVAL '1 day' AND "created_at"<$2`,
    [from, to],
  );
  const startedInside = await insertRun({
    status: "succeeded",
    createdAt: new Date(from.getTime() - 600_000),
  });
  const startedAfter = await insertRun({
    status: "succeeded",
    createdAt: new Date(from.getTime() + 600_000),
  });
  await pool.query(
    `UPDATE "_damat_job_runs" SET
       "available_at"=$2::timestamptz+INTERVAL '1 minute',
       "started_at"=$2::timestamptz+INTERVAL '2 minutes' WHERE "id"=$1`,
    [startedInside.id, from],
  );
  await pool.query(
    `UPDATE "_damat_job_runs" SET
       "available_at"=$2::timestamptz+INTERVAL '20 minutes',
       "started_at"=$3::timestamptz+INTERVAL '1 minute' WHERE "id"=$1`,
    [startedAfter.id, from, to],
  );
  await insertAttempt(
    startedInside.id,
    new Date(from.getTime() + 120_000),
    60_000,
  );
  await insertAttempt(startedAfter.id, new Date(to.getTime() + 60_000), 1);
  const result = await inspection().getSummary({
    from,
    to,
    intervalMs: 60_000,
    now: to,
  });
  expect(result.waitingDuration).toMatchObject({ count: 1, maxMs: 60_000 });
});

function insertAttempt(runId: string, startedAt: Date, waitMs: number) {
  return pool.query(
    `INSERT INTO "_damat_job_attempts"
       ("run_id","attempt_number","worker_id","lease_token","started_at","wait_ms")
     VALUES ($1,1,'waiting-summary',$2,$3,$4)`,
    [runId, crypto.randomUUID(), startedAt, waitMs],
  );
}
