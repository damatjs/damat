import { expect, test } from "bun:test";
import {
  enqueueJob,
  getJobRun,
  listJobActivity,
  listJobAttempts,
  listJobLogs,
  listJobRuns,
} from "../../src/client";
import { findJobSchedules } from "../../src/repositories";
import { ensureStorage, pool, uniqueName } from "./context";

test("run reads are normalized and ordered by numeric priority", async () => {
  await ensureStorage();
  const name = uniqueName("read");
  const low = await enqueueJob(name, { value: 2 }, { priority: 20 });
  const high = await enqueueJob(name, { value: 1 }, { priority: 1 });
  const runs = await listJobRuns({ name });
  expect(runs.map(({ id }) => id)).toEqual([high.id, low.id]);
  const selected = await getJobRun(high.id);
  expect(selected?.createdAt).toBeInstanceOf(Date);
  expect(selected?.availableAt).toBeInstanceOf(Date);
  expect(selected?.attemptCount).toBe(0);
});

test("attempt, activity, and log reads return domain records", async () => {
  await ensureStorage();
  const run = await enqueueJob(uniqueName("records"), {});
  await pool.query(
    `INSERT INTO "_damat_job_attempts"
      ("run_id", "attempt_number", "worker_id", "lease_token", "outcome")
     VALUES ($1, 1, 'worker-1', $2, 'succeeded')`,
    [run.id, crypto.randomUUID()],
  );
  await pool.query(
    `INSERT INTO "_damat_job_logs"
      ("run_id", "attempt_number", "level", "message", "sequence")
     VALUES ($1, 1, 'info', 'worked', 1)`,
    [run.id],
  );
  expect(await listJobAttempts(run.id)).toMatchObject([
    { runId: run.id, attemptNumber: 1, outcome: "succeeded" },
  ]);
  expect(await listJobActivity(run.id)).toMatchObject([
    { runId: run.id, type: "enqueued" },
  ]);
  expect(await listJobLogs(run.id)).toMatchObject([
    { runId: run.id, attemptNumber: 1, level: "info", message: "worked" },
  ]);
});

test("schedule repository normalizes PostgreSQL rows", async () => {
  await ensureStorage();
  const id = crypto.randomUUID();
  const name = uniqueName("schedule");
  await pool.query(
    `INSERT INTO "_damat_job_schedules"
       ("id","name","job_name","kind","payload","queue","next_occurrence_at")
     VALUES ($1,$2,'scheduled-job','once','{}','scheduled',$3)`,
    [id, name, new Date()],
  );
  expect(await findJobSchedules({ enabled: true })).toContainEqual(
    expect.objectContaining({
      id,
      name,
      jobName: "scheduled-job",
      kind: "once",
      nextOccurrenceAt: expect.any(Date),
    }),
  );
});
