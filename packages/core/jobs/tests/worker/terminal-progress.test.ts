import { beforeEach, expect, test } from "bun:test";
import { getJobRun, listJobActivity } from "../../src/client";
import { defineJob } from "../../src/definitions/registry";
import { claimJobRuns } from "../../src/worker/claim";
import { executeJobClaim } from "../../src/worker/execute";
import { pool, prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

test("terminal activity includes the latest progress snapshot", async () => {
  const item = await queuedRun();
  const name = `${item.name}-progress`;
  defineJob(name, async (_payload, context) => {
    await context.progress({ percent: 73, phase: "writing" });
    return { done: true };
  });
  await pool.query(`UPDATE "_damat_job_runs" SET "name" = $2 WHERE "id" = $1`, [
    item.run.id,
    name,
  ]);
  const [claim] = await claimJobRuns({
    queue: item.queue,
    workerId: "worker-terminal-progress",
    limit: 1,
    leaseMs: 30_000,
  });
  await executeJobClaim(claim!, { heartbeatIntervalMs: 5_000 });
  expect((await getJobRun(item.run.id))?.status).toBe("succeeded");
  expect((await listJobActivity(item.run.id)).at(-1)).toMatchObject({
    type: "succeeded",
    metadata: { progress: { percent: 73, phase: "writing" } },
  });
});
