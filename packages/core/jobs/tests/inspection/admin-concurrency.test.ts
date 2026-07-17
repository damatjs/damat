import { beforeAll, expect, test } from "bun:test";
import { createJobSchedule } from "../../src/schedules";
import { ensureStorage, inspection, pool, uniqueName } from "./context";

beforeAll(ensureStorage);

const actor = { id: "concurrent-admin", type: "service" as const };

test("concurrent first pause writes one transition", async () => {
  const queue = uniqueName("concurrent-pause");
  const client = inspection();
  const results = await Promise.allSettled([
    client.pauseQueue(queue, actor),
    client.pauseQueue(queue, actor),
  ]);
  expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
    1,
  );
  expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
  const activity = await pool.query(
    `SELECT 1 FROM "_damat_work_control_activity"
     WHERE "work_kind"='job' AND "scope"=$1 AND "action"='paused'`,
    [queue],
  );
  expect(activity.rowCount).toBe(1);
});

test("concurrent schedule enable writes one attributed transition", async () => {
  const schedule = await createJobSchedule({
    name: uniqueName("concurrent-schedule"),
    jobName: uniqueName("concurrent-job"),
    payload: {},
    enabled: false,
    schedule: { kind: "once", at: new Date(Date.now() + 60_000) },
  });
  const client = inspection();
  const results = await Promise.allSettled([
    client.enableSchedule(schedule.id, actor),
    client.enableSchedule(schedule.id, actor),
  ]);
  expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
    1,
  );
  expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
  const activity = await pool.query(
    `SELECT "actor" FROM "_damat_job_schedule_activity"
     WHERE "schedule_id"=$1 AND "type"='enabled'`,
    [schedule.id],
  );
  expect(activity.rows).toEqual([{ actor }]);
});
