import { beforeAll, describe, expect, test } from "bun:test";
import {
  createJobSchedule,
  listJobSchedules,
  updateJobSchedule,
} from "../../src/schedules";
import { reconcileJobSchedules } from "../../src/worker/reconcileSchedules";
import { pool, prepareSchedules, scheduleInput } from "./context";
import { durability } from "../storage/context";

beforeAll(prepareSchedules);

describe("job schedules", () => {
  test("disabled schedules stay dormant until enabled", async () => {
    const created = await createJobSchedule({
      ...scheduleInput(),
      enabled: false,
    });
    expect(created.enabled).toBe(false);
    await reconcileJobSchedules({ limit: 10 });
    const dormant = await pool.query(
      `SELECT 1 FROM "_damat_job_runs" WHERE "schedule_id"=$1`,
      [created.id],
    );
    expect(dormant.rowCount).toBe(0);

    const updated = await updateJobSchedule(created.id, { enabled: true });
    expect(updated?.enabled).toBe(true);
    const listed = await listJobSchedules({ enabled: true });
    expect(listed.some(({ id }) => id === created.id)).toBe(true);
    expect(await reconcileJobSchedules({ limit: 10 })).toBeGreaterThanOrEqual(
      1,
    );
  });

  test("overlapping reconcilers create one occurrence and advance it", async () => {
    const created = await createJobSchedule(scheduleInput("interval"));
    const scheduledFor = created.nextOccurrenceAt!;
    const counts = await Promise.all([
      reconcileJobSchedules({ limit: 10 }),
      reconcileJobSchedules({ limit: 10 }),
    ]);
    expect(counts[0]! + counts[1]!).toBeGreaterThanOrEqual(1);
    const runs = await pool.query(
      `SELECT "scheduled_for" FROM "_damat_job_runs" WHERE "schedule_id"=$1`,
      [created.id],
    );
    expect(runs.rowCount).toBe(1);
    expect(runs.rows[0]!.scheduled_for).toEqual(scheduledFor);
    const [current] = await listJobSchedules({ enabled: true });
    expect(current).toBeDefined();
    const refreshed = await pool.query(
      `SELECT "last_occurrence_at","next_occurrence_at"
       FROM "_damat_job_schedules" WHERE "id"=$1`,
      [created.id],
    );
    expect(refreshed.rows[0]!.last_occurrence_at).toEqual(scheduledFor);
    expect(refreshed.rows[0]!.next_occurrence_at).toEqual(
      new Date(scheduledFor.getTime() + 60_000),
    );
  });

  test("requires transactional executors", async () => {
    expect(reconcileJobSchedules({ limit: 1, executor: pool })).rejects.toThrow(
      "active transaction executor",
    );
  });

  test("accepts an active transaction executor", async () => {
    const schedule = await durability.transaction((executor) =>
      createJobSchedule({ ...scheduleInput(), executor }),
    );
    expect(schedule.id).toBeString();
  });

  test("an existing occurrence is an idempotent reconciliation", async () => {
    const created = await createJobSchedule(scheduleInput("interval"));
    const occurrence = created.nextOccurrenceAt!;
    await reconcileJobSchedules({ limit: 100 });
    await pool.query(
      `UPDATE "_damat_job_schedules" SET "next_occurrence_at"=$2
       WHERE "id"=$1`,
      [created.id, occurrence],
    );
    await expect(
      reconcileJobSchedules({ limit: 100 }),
    ).resolves.toBeGreaterThanOrEqual(0);
    const runs = await pool.query(
      `SELECT 1 FROM "_damat_job_runs" WHERE "schedule_id"=$1
       AND "scheduled_for"=$2`,
      [created.id, occurrence],
    );
    expect(runs.rowCount).toBe(1);
  });
});
