import { expect, test } from "bun:test";
import { enqueueJob } from "../../src/client";
import { ensureStorage, pool, uniqueName } from "./context";
import { insertSchedule } from "./integrity-fixture";

test("duration and schedule policy values cannot be negative", async () => {
  await ensureStorage();
  const run = await enqueueJob(uniqueName("policy-check"), {});
  await expect(
    pool.query(
      `INSERT INTO "_damat_job_attempts"
       ("run_id","attempt_number","worker_id","lease_token","duration_ms")
       VALUES ($1,1,'worker',$2,-1)`,
      [run.id, crypto.randomUUID()],
    ),
  ).rejects.toThrow();
  await expect(
    pool.query(
      `INSERT INTO "_damat_job_activity" ("run_id","type","duration_ms")
       VALUES ($1,'invalid_duration',-1)`,
      [run.id],
    ),
  ).rejects.toThrow();
  await expectSchedulePolicyRejected("backoff_ms", -1);
  await expectSchedulePolicyRejected("deduplication_ttl_ms", -1);
  await expectSchedulePolicyRejected("backoff_multiplier", 0.5);
});

async function expectSchedulePolicyRejected(
  column: string,
  value: number,
): Promise<void> {
  const scheduleId = await insertSchedule();
  await expect(
    pool.query(
      `UPDATE "_damat_job_schedules" SET "${column}" = $1 WHERE "id" = $2`,
      [value, scheduleId],
    ),
  ).rejects.toThrow();
}
