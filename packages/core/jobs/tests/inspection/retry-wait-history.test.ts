import { beforeAll, expect, test } from "bun:test";
import { claimJobRuns } from "../../src/worker/claim";
import { completeJobFailure } from "../../src/worker/fail";
import {
  ensureStorage,
  insertRun,
  inspection,
  pool,
  uniqueName,
} from "./context";

beforeAll(ensureStorage);

test("retry attempts retain wait timing and each effective schedule", async () => {
  const run = await insertRun({});
  await pool.query(
    `UPDATE "_damat_job_runs" SET "available_at"=NOW()-INTERVAL '2 seconds'
     WHERE "id"=$1`,
    [run.id],
  );
  const first = await claim(run.queue, uniqueName("retry-worker-one"));
  await completeJobFailure(first, new Error("first"));
  await pool.query(
    `UPDATE "_damat_job_runs" SET "available_at"=NOW()-INTERVAL '5 seconds'
     WHERE "id"=$1`,
    [run.id],
  );
  const second = await claim(run.queue, uniqueName("retry-worker-two"));
  await completeJobFailure(second, new Error("second"));
  const detail = await inspection().getRun(run.id);
  expect(detail?.attempts).toHaveLength(2);
  expect(detail?.attempts[1]?.availableAt).toBeInstanceOf(Date);
  expect(detail?.attempts[1]?.waitMs).toBeGreaterThanOrEqual(5_000);
  const schedules = detail?.activity
    .filter(({ type }) => type === "retry_wait")
    .map(({ metadata }) => metadata.availableAt);
  expect(schedules).toHaveLength(2);
  expect(schedules?.every((value) => typeof value === "string")).toBe(true);
});

async function claim(queue: string, workerId: string) {
  const claims = await claimJobRuns({
    queue,
    workerId,
    limit: 1,
    leaseMs: 30_000,
  });
  return claims[0]!;
}
