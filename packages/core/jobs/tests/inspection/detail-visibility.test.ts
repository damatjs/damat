import { beforeAll, expect, test } from "bun:test";
import { registerWorker } from "@damatjs/durability";
import { createJobSchedule } from "../../src/schedules";
import {
  ensureStorage,
  insertRun,
  inspection,
  pool,
  uniqueName,
} from "./context";

beforeAll(ensureStorage);

test("metadata detail keeps operational errors and schedule history", async () => {
  const schedule = await createJobSchedule({
    name: uniqueName("detail-schedule"),
    jobName: uniqueName("detail-job"),
    payload: { token: "schedule-payload" },
    metadata: { token: "schedule-metadata" },
    schedule: { kind: "once", at: new Date(Date.now() + 60_000) },
  });
  const run = await insertRun({ payload: { token: "secret" } });
  const token = crypto.randomUUID();
  const worker = uniqueName("detail-worker");
  await registerWorker({
    id: worker,
    capabilities: ["jobs"],
    hostname: "localhost",
    processId: 1,
    application: { token: "application" },
    deployment: { token: "deployment" },
    concurrency: 1,
  });
  await pool.query(
    `UPDATE "_damat_job_runs" SET "status"='dead_lettered',"attempt_count"=1,
     "schedule_id"=$2,"scheduled_for"=NOW(),"progress"='{"token":"p"}',
     "result"='{"token":"r"}',"last_error"='{"token":"e"}',
     "completed_at"=NOW() WHERE "id"=$1`,
    [run.id, schedule.id],
  );
  await pool.query(
    `INSERT INTO "_damat_job_attempts"
     ("run_id","attempt_number","worker_id","lease_token","result","error")
     VALUES ($1,1,$2,$3,'{"token":"result"}','{"token":"error"}')`,
    [run.id, worker, token],
  );
  await pool.query(
    `INSERT INTO "_damat_job_schedule_activity"
     ("schedule_id","type","metadata","actor")
     VALUES ($1,'updated','{"token":"activity"}',
       '{"id":"actor","type":"user","metadata":{"token":"actor"}}')`,
    [schedule.id],
  );
  const client = inspection({
    redaction: { keys: ["token"] },
  });
  await client.pauseQueue(run.queue, {
    id: "actor",
    type: "user",
    metadata: { token: "control" },
  });
  const detail = await client.getRun(run.id);
  expect(detail).toMatchObject({
    metadata: { source: "inspection" },
    progress: { token: "[REDACTED]" },
    lastError: { token: "[REDACTED]" },
    schedule: { id: schedule.id },
  });
  expect(detail).not.toHaveProperty("payload");
  expect(detail).not.toHaveProperty("result");
  expect(detail?.schedule).not.toHaveProperty("payload");
  expect(detail?.schedule?.metadata).toEqual({ token: "[REDACTED]" });
  expect(detail?.attempts[0]).not.toHaveProperty("result");
  expect(detail?.attempts[0]?.error).toEqual({ token: "[REDACTED]" });
  expect(detail?.attempts[0]?.startedAt).toBeInstanceOf(Date);
  expect(detail?.workers[0]?.application).toEqual({ token: "[REDACTED]" });
  expect(detail?.controlActivity[0]?.actor.metadata).toEqual({
    token: "[REDACTED]",
  });
  expect(detail?.scheduleActivity[0]?.occurredAt).toBeInstanceOf(Date);
  expect(detail?.scheduleActivity[1]?.actor.metadata).toEqual({
    token: "[REDACTED]",
  });
  const full = await inspection({
    visibility: "full",
    redaction: { keys: ["token"] },
  }).getRun(run.id);
  expect(full?.schedule?.payload).toEqual({ token: "[REDACTED]" });
  const hidden = await inspection({ visibility: "hidden" }).getRun(run.id);
  expect(hidden?.schedule).not.toHaveProperty("metadata");
  expect(hidden?.workers[0]).not.toHaveProperty("application");
  expect(hidden?.workers[0]).not.toHaveProperty("deployment");
});
