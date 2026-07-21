import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { retryJobRun } from "../../src/client";
import { clearJobDefinitions, defineJob } from "../../src/definitions/registry";
import { createJobSchedule, updateJobSchedule } from "../../src/schedules";
import { reconcileJobSchedules } from "../../src/worker/reconcileSchedules";
import {
  clearJobWakeupPublisher,
  configureJobWakeupPublisher,
} from "../../src/wakeup";
import { ensureStorage, pool, uniqueName } from "../storage/context";
import { queuedRun } from "../worker/context";

beforeAll(ensureStorage);
beforeEach(() => {
  clearJobDefinitions();
  clearJobWakeupPublisher();
});

describe("post-commit mutation wake-ups", () => {
  test("schedule mutations publish only when enabled", async () => {
    const queue = uniqueName("schedule-wakeup");
    const jobName = uniqueName("scheduled-job");
    defineJob(jobName, async () => {}, { queue });
    const messages: string[] = [];
    configureJobWakeupPublisher({
      publish: async (_channel, message) => (messages.push(message), 1),
    });
    const schedule = await createJobSchedule({
      name: uniqueName("schedule"),
      jobName,
      payload: {},
      enabled: false,
      schedule: { kind: "once", at: new Date(Date.now() + 60_000) },
    });
    expect(messages).toHaveLength(0);
    await updateJobSchedule(schedule.id, { enabled: true });
    expect(JSON.parse(messages[0]!)).toEqual({ kind: "jobs", queue });
  });

  test("retry publication observes the committed queued state", async () => {
    const item = await queuedRun();
    await pool.query(
      `UPDATE "_damat_job_runs" SET "status"='dead_lettered',"completed_at"=NOW()
       WHERE "id"=$1`,
      [item.run.id],
    );
    let visible = "";
    configureJobWakeupPublisher({
      publish: async () => {
        visible = (
          await pool.query(
            `SELECT "status" FROM "_damat_job_runs" WHERE "id"=$1`,
            [item.run.id],
          )
        ).rows[0]!.status;
        return 1;
      },
    });
    await retryJobRun(item.run.id);
    expect(visible).toBe("queued");
  });

  test("schedule reconciliation publishes after occurrence commit", async () => {
    const queue = uniqueName("occurrence-wakeup");
    const jobName = uniqueName("occurrence-job");
    defineJob(jobName, async () => {}, { queue });
    const schedule = await createJobSchedule({
      name: uniqueName("due-schedule"),
      jobName,
      payload: {},
      queue,
      schedule: { kind: "once", at: new Date(Date.now() - 1_000) },
    });
    let visible = 0;
    configureJobWakeupPublisher({
      publish: async () => {
        visible =
          (
            await pool.query(
              `SELECT 1 FROM "_damat_job_runs" WHERE "schedule_id"=$1`,
              [schedule.id],
            )
          ).rowCount ?? 0;
        return 1;
      },
    });
    await reconcileJobSchedules({ limit: 100 });
    expect(visible).toBe(1);
  });
});
