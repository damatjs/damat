import { beforeAll, describe, expect, test } from "bun:test";
import { listJobActivity } from "../../src/client";
import { reconcileExpiredJobLeases } from "../../src/worker/reconcileLeases";
import { claimJobRuns } from "../../src/worker/claim";
import { pool, prepareWorkerTest, queuedRun } from "../worker/context";

beforeAll(prepareWorkerTest);

describe("expired job lease reconciliation", () => {
  test("recovers by lease expiry without consulting worker registry", async () => {
    const item = await queuedRun();
    const [claimed] = await claimJobRuns({
      queue: item.queue,
      workerId: "missing-registry-worker",
      limit: 1,
      leaseMs: 30_000,
    });
    await pool.query(
      `UPDATE "_damat_job_runs" SET "lease_expires_at"=NOW()-INTERVAL '1 second'
       WHERE "id"=$1`,
      [item.run.id],
    );

    expect(
      await reconcileExpiredJobLeases({ limit: 10, queue: item.queue }),
    ).toBe(1);
    const state = await pool.query(
      `SELECT "status","lease_token" FROM "_damat_job_runs" WHERE "id"=$1`,
      [item.run.id],
    );
    expect(state.rows[0]).toMatchObject({
      status: "queued",
      lease_token: null,
    });
    const activity = await listJobActivity(item.run.id);
    expect(activity.at(-1)).toMatchObject({
      type: "lease_recovered",
      workerId: "missing-registry-worker",
      leaseToken: claimed?.leaseToken,
    });
  });
});
