import { beforeAll, describe, expect, test } from "bun:test";
import { createJobSchedule } from "../../src/schedules";
import { ensureStorage, inspection, pool, uniqueName } from "./context";

beforeAll(ensureStorage);

const actor = { id: "operator-controls", type: "service" as const };

describe("job inspection controls", () => {
  test("serializes queue pause and resume with one audit each", async () => {
    const queue = uniqueName("admin-queue");
    const client = inspection();
    await client.pauseQueue(queue, actor, "deploy");
    await expect(client.pauseQueue(queue, actor)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await client.resumeQueue(queue, actor);
    const result = await pool.query(
      `SELECT "action","actor" FROM "_damat_work_control_activity"
       WHERE "work_kind"='job' AND "scope"=$1 ORDER BY "id"`,
      [queue],
    );
    expect(result.rows).toEqual([
      { action: "paused", actor },
      { action: "resumed", actor },
    ]);
  });

  test("attributes schedule enable and rejects unchanged state", async () => {
    const schedule = await createJobSchedule({
      name: uniqueName("admin-schedule"),
      jobName: uniqueName("admin-job"),
      payload: {},
      enabled: false,
      schedule: { kind: "once", at: new Date(Date.now() + 60_000) },
    });
    const client = inspection();
    expect((await client.enableSchedule(schedule.id, actor)).enabled).toBe(
      true,
    );
    await expect(
      client.enableSchedule(schedule.id, actor),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    expect(
      (await client.disableSchedule(schedule.id, actor, "hold")).enabled,
    ).toBe(false);
    const result = await pool.query(
      `SELECT "type","actor","metadata" FROM "_damat_job_schedule_activity"
       WHERE "schedule_id"=$1 AND "type" IN ('enabled','disabled') ORDER BY "id"`,
      [schedule.id],
    );
    expect(result.rows).toEqual([
      { type: "enabled", actor, metadata: {} },
      { type: "disabled", actor, metadata: { reason: "hold" } },
    ]);
  });
});
