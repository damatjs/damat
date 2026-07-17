import { beforeAll, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

test("failure range must match one activity inside the half-open window", async () => {
  const run = await insertRun({});
  const from = new Date(Date.now() - 10_000);
  const to = new Date(Date.now() + 10_000);
  await pool.query(
    `INSERT INTO "_damat_job_activity" ("run_id","type","occurred_at")
     VALUES ($1,'retry_wait',$2),($1,'dead_lettered',$3)`,
    [run.id, new Date(from.getTime() - 1_000), new Date(to.getTime() + 1_000)],
  );
  const outside = await inspection().listRuns({
    queues: [run.queue],
    failed: { from, to },
  });
  expect(outside.items).toHaveLength(0);
  await pool.query(
    `INSERT INTO "_damat_job_activity" ("run_id","type","occurred_at")
     VALUES ($1,'retry_wait',$2)`,
    [run.id, from],
  );
  const inside = await inspection().listRuns({
    queues: [run.queue],
    failed: { from, to },
  });
  expect(inside.items[0]?.id).toBe(run.id);
});
