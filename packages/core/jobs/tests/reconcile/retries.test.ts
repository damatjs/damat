import { beforeAll, describe, expect, test } from "bun:test";
import { reconcileJobRetries } from "../../src/worker/reconcileRetries";
import { pool, prepareWorkerTest, queuedRun } from "../worker/context";

beforeAll(prepareWorkerTest);

describe("job retry reconciliation", () => {
  test("promotes only due retry_wait rows", async () => {
    const due = await queuedRun();
    const future = await queuedRun();
    const otherQueue = await queuedRun();
    await pool.query(
      `UPDATE "_damat_job_runs" SET "status"='retry_wait',
       "available_at"=CASE WHEN "id"=$1 THEN NOW()-INTERVAL '1 second'
       ELSE NOW()+INTERVAL '1 hour' END WHERE "id"=ANY($2::uuid[])`,
      [due.run.id, [due.run.id, future.run.id]],
    );
    await pool.query(
      `UPDATE "_damat_job_runs" SET "status"='retry_wait',
       "available_at"=NOW()-INTERVAL '1 second' WHERE "id"=$1`,
      [otherQueue.run.id],
    );

    expect(await reconcileJobRetries({ limit: 10, queue: due.queue })).toBe(1);
    const states = await pool.query(
      `SELECT "id","status" FROM "_damat_job_runs" WHERE "id"=ANY($1::uuid[])`,
      [[due.run.id, future.run.id]],
    );
    expect(states.rows.find(({ id }) => id === due.run.id)?.status).toBe(
      "queued",
    );
    expect(states.rows.find(({ id }) => id === future.run.id)?.status).toBe(
      "retry_wait",
    );
    const isolated = await pool.query(
      `SELECT "status" FROM "_damat_job_runs" WHERE "id"=$1`,
      [otherQueue.run.id],
    );
    expect(isolated.rows[0]!.status).toBe("retry_wait");
  });
});
