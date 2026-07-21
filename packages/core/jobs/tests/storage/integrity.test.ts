import { expect, test } from "bun:test";
import { enqueueJob } from "../../src/client";
import { ensureStorage, pool, uniqueName } from "./context";
import { insertRun, insertSchedule } from "./integrity-fixture";

test("schedule occurrence columns must be paired", async () => {
  await ensureStorage();
  const scheduleId = await insertSchedule();
  await expect(insertRun({ scheduleId })).rejects.toThrow();
  await expect(insertRun({ scheduledFor: new Date() })).rejects.toThrow();
});

test("paired schedule occurrences remain unique", async () => {
  await ensureStorage();
  const scheduleId = await insertSchedule();
  const scheduledFor = new Date();
  await insertRun({ scheduleId, scheduledFor });
  await expect(insertRun({ scheduleId, scheduledFor })).rejects.toThrow();
});

test("schedules with persisted occurrences cannot be deleted", async () => {
  await ensureStorage();
  const scheduleId = await insertSchedule();
  await insertRun({ scheduleId, scheduledFor: new Date() });
  await expect(
    pool.query(`DELETE FROM "_damat_job_schedules" WHERE "id" = $1`, [
      scheduleId,
    ]),
  ).rejects.toThrow();
});

test("attempt-scoped activity and logs require an existing attempt", async () => {
  await ensureStorage();
  const run = await enqueueJob(uniqueName("attempt-fk"), {});
  await expect(
    pool.query(
      `INSERT INTO "_damat_job_logs"
       ("run_id","attempt_number","level","message","sequence")
       VALUES ($1,99,'info','missing',1)`,
      [run.id],
    ),
  ).rejects.toThrow();
  await expect(
    pool.query(
      `INSERT INTO "_damat_job_activity" ("run_id","attempt_number","type")
       VALUES ($1,99,'missing')`,
      [run.id],
    ),
  ).rejects.toThrow();
  await pool.query(
    `INSERT INTO "_damat_job_activity" ("run_id","type")
     VALUES ($1,'run_level')`,
    [run.id],
  );
});

test("millisecond policy and duration columns use bigint", async () => {
  await ensureStorage();
  const columns = [
    ["_damat_job_runs", "backoff_ms"],
    ["_damat_job_attempts", "duration_ms"],
    ["_damat_job_activity", "duration_ms"],
    ["_damat_job_schedules", "backoff_ms"],
    ["_damat_job_schedules", "interval_ms"],
    ["_damat_job_schedules", "deduplication_ttl_ms"],
  ];
  const result = await pool.query<{ data_type: string }>(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    columns[0],
  );
  for (const [table, column] of columns) {
    const row =
      table === columns[0]![0] && column === columns[0]![1]
        ? result.rows[0]
        : (
            await pool.query<{ data_type: string }>(
              `SELECT data_type FROM information_schema.columns
               WHERE table_name = $1 AND column_name = $2`,
              [table, column],
            )
          ).rows[0];
    expect(row?.data_type).toBe("bigint");
  }
});
