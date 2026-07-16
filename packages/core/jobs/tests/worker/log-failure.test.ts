import { beforeEach, expect, test } from "bun:test";
import { getJobRun } from "../../src/client";
import { defineJob } from "../../src/definitions/registry";
import { claimJobRuns } from "../../src/worker/claim";
import { executeJobClaim } from "../../src/worker/execute";
import { pool, prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

test("log persistence failures become visible job failures", async () => {
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const trigger = `_damat_test_log_${suffix}`;
  const fn = `${trigger}_fn`;
  const item = await queuedRun(undefined, { maxAttempts: 1 });
  const name = `${item.name}-log-failure`;
  defineJob(name, async (_payload, context) => {
    await context.log("info", "force-log-failure");
  });
  await pool.query(`UPDATE "_damat_job_runs" SET "name"=$2 WHERE "id"=$1`, [
    item.run.id,
    name,
  ]);
  await installFailureTrigger(fn, trigger);
  try {
    const [claim] = await claimJobRuns({
      queue: item.queue,
      workerId: "worker-log-failure",
      limit: 1,
      leaseMs: 30_000,
    });
    await executeJobClaim(claim!, { heartbeatIntervalMs: 5_000 });
    expect((await getJobRun(item.run.id))?.status).toBe("dead_lettered");
  } finally {
    await pool.query(
      `DROP TRIGGER IF EXISTS "${trigger}" ON "_damat_job_logs"`,
    );
    await pool.query(`DROP FUNCTION IF EXISTS "${fn}"()`);
  }
});

async function installFailureTrigger(fn: string, trigger: string) {
  await pool.query(`
    CREATE FUNCTION "${fn}"() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.message = 'force-log-failure' THEN
        RAISE EXCEPTION 'forced log persistence failure';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER "${trigger}" BEFORE INSERT ON "_damat_job_logs"
    FOR EACH ROW EXECUTE FUNCTION "${fn}"()
  `);
}
