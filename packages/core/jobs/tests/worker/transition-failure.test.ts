import { beforeEach, expect, test } from "bun:test";
import { getJobRun } from "../../src/client";
import { defineJob } from "../../src/definitions/registry";
import { claimJobRuns } from "../../src/worker/claim";
import { executeJobClaim } from "../../src/worker/execute";
import { expireLease, pool, prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

test("terminal transition failures are contained after lease loss", async () => {
  const item = await queuedRun(undefined, { maxAttempts: 1 });
  const name = `${item.name}-lease-loss`;
  defineJob(name, async () => {
    await expireLease(item.run.id);
    throw new Error("handler failed after lease loss");
  });
  await pool.query(`UPDATE "_damat_job_runs" SET "name"=$2 WHERE "id"=$1`, [
    item.run.id,
    name,
  ]);
  const [claim] = await claimJobRuns({
    queue: item.queue,
    workerId: "worker-transition-failure",
    limit: 1,
    leaseMs: 30_000,
  });
  await executeJobClaim(claim!, { heartbeatIntervalMs: 5_000 });
  expect((await getJobRun(item.run.id))?.status).toBe("running");
});
