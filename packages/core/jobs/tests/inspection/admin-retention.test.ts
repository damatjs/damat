import { beforeAll, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

test("retention correlates actor-attributed request and outcome", async () => {
  const actor = {
    id: `retention-${crypto.randomUUID()}`,
    type: "system" as const,
  };
  const run = await insertRun({ status: "succeeded" });
  await pool.query(
    `UPDATE "_damat_job_runs" SET "completed_at"='2000-01-01' WHERE "id"=$1`,
    [run.id],
  );
  const result = await inspection().runRetention(
    { terminalBefore: new Date("2001-01-01"), batchSize: 1 },
    actor,
  );
  expect(result.deletedRuns).toBe(1);
  const activity = await pool.query(
    `SELECT "status","details" FROM "_damat_maintenance_activity"
     WHERE "actor"->>'id'=$1 ORDER BY "id"`,
    [actor.id],
  );
  expect(activity.rows.map(({ status }) => status)).toEqual([
    "requested",
    "completed",
  ]);
  expect(activity.rows[0].details.requestId).toBeString();
  expect(activity.rows[1].details.requestId).toBe(
    activity.rows[0].details.requestId,
  );
  expect(activity.rows[0].details.deduplicationBefore).toBeString();
  expect(activity.rows[1].details.deduplicationBefore).toBe(
    activity.rows[0].details.deduplicationBefore,
  );
  expect(activity.rows[0].details.terminalBefore).toBe(
    new Date("2001-01-01").toISOString(),
  );
  expect(activity.rows[1].details.terminalBefore).toBe(
    activity.rows[0].details.terminalBefore,
  );
});
