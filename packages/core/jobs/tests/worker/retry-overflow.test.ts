import { beforeEach, expect, test } from "bun:test";
import { getJobRun } from "../../src/client";
import { defineJob } from "../../src/definitions/registry";
import { claimJobRuns } from "../../src/worker/claim";
import { executeJobClaim } from "../../src/worker/execute";
import { pool, prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

test("an overflowing retry date dead-letters without retaining a lease", async () => {
  const item = await queuedRun(undefined, { maxAttempts: 2 });
  const name = `${item.name}-overflow`;
  defineJob(name, async () => {
    throw new Error("retry me");
  });
  await pool.query(
    `UPDATE "_damat_job_runs" SET "name"=$2,
       "backoff_ms"=8640000000000000 WHERE "id"=$1`,
    [item.run.id, name],
  );
  const [claim] = await claimJobRuns({
    queue: item.queue,
    workerId: "worker-retry-overflow",
    limit: 1,
    leaseMs: 30_000,
  });
  await executeJobClaim(claim!, { heartbeatIntervalMs: 5_000 });
  expect((await getJobRun(item.run.id))?.status).toBe("dead_lettered");
  const lease = await pool.query(
    `SELECT "lease_owner" FROM "_damat_job_runs" WHERE "id"=$1`,
    [item.run.id],
  );
  expect(lease.rows[0]?.lease_owner).toBeNull();
});
