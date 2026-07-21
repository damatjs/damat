import { beforeAll, expect, test } from "bun:test";
import { createJobSchedule } from "../../src/schedules";
import {
  clearJobWakeupPublisher,
  configureJobWakeupPublisher,
} from "../../src/wakeup";
import { ensureStorage, inspection, pool, uniqueName } from "./context";

beforeAll(ensureStorage);

const actor = { id: "wakeup-admin", type: "system" as const };

test("resume and schedule enable wake only after commit", async () => {
  const queue = uniqueName("admin-wakeup");
  const schedule = await createJobSchedule({
    name: uniqueName("wakeup-schedule"),
    jobName: uniqueName("wakeup-job"),
    payload: {},
    queue,
    enabled: false,
    schedule: { kind: "once", at: new Date(Date.now() + 60_000) },
  });
  const client = inspection();
  await client.pauseQueue(queue, actor);
  const observed: Array<boolean> = [];
  configureJobWakeupPublisher({
    publish: async () => {
      const control = await pool.query(
        `SELECT "paused" FROM "_damat_work_controls"
         WHERE "work_kind"='job' AND "scope"=$1`,
        [queue],
      );
      const enabled = await pool.query(
        `SELECT "enabled" FROM "_damat_job_schedules" WHERE "id"=$1`,
        [schedule.id],
      );
      observed.push(
        control.rows[0]?.paused === false || enabled.rows[0]?.enabled === true,
      );
      return 1;
    },
  });
  try {
    await client.resumeQueue(queue, actor);
    await client.enableSchedule(schedule.id, actor);
  } finally {
    clearJobWakeupPublisher();
  }
  expect(observed).toEqual([true, true]);
});
