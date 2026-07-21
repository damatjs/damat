import { beforeAll, describe, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

describe("job operational summary", () => {
  test("returns bounded status, throughput, duration, and lease metrics", async () => {
    const from = new Date("2040-01-01T00:00:00Z");
    const to = new Date("2040-01-01T01:00:00Z");
    await pool.query(
      `DELETE FROM "_damat_job_runs" WHERE "created_at" BETWEEN $1 AND $2`,
      [from, to],
    );
    const baseline = await pool.query<{ status: string; count: string }>(
      `SELECT "status",COUNT(*)::text count FROM "_damat_job_runs"
       GROUP BY "status"`,
    );
    const counts = Object.fromEntries(
      baseline.rows.map(({ status, count }) => [status, +count]),
    );
    const queued = await insertRun({ status: "queued", createdAt: from });
    const succeeded = await insertRun({ status: "succeeded", createdAt: from });
    const failed = await insertRun({
      status: "dead_lettered",
      createdAt: from,
    });
    await pool.query(
      `UPDATE "_damat_job_runs" SET "available_at"=$2::timestamptz,
       "started_at"=$2::timestamptz+INTERVAL '1 second',"completed_at"=CASE
         WHEN "status" IN ('succeeded','dead_lettered')
         THEN $2::timestamptz+INTERVAL '2 seconds'
         ELSE NULL END,
       "last_error"=CASE WHEN "status"='dead_lettered'
         THEN '{"message":"boom"}'::jsonb ELSE NULL END
       WHERE "id"=ANY($1::uuid[])`,
      [[queued.id, succeeded.id, failed.id], from],
    );
    await pool.query(
      `INSERT INTO "_damat_job_activity" ("run_id","type","occurred_at")
       VALUES ($1,'succeeded',$3),($2,'dead_lettered',$3)`,
      [succeeded.id, failed.id, new Date(from.getTime() + 2_000)],
    );
    await pool.query(
      `INSERT INTO "_damat_job_attempts"
       ("run_id","attempt_number","worker_id","lease_token","finished_at","duration_ms")
       VALUES ($1,1,'summary-worker',$2,$3,1000)`,
      [succeeded.id, crypto.randomUUID(), new Date(from.getTime() + 2_000)],
    );
    const result = await inspection().getSummary({
      from,
      to,
      intervalMs: 60_000,
      now: new Date(from.getTime() + 10_000),
    });
    expect(result.statusCounts.queued).toBe((counts.queued ?? 0) + 1);
    expect(result.statusCounts.succeeded).toBe((counts.succeeded ?? 0) + 1);
    expect(result.statusCounts.dead_lettered).toBe(
      (counts.dead_lettered ?? 0) + 1,
    );
    expect(result.throughput).toContainEqual({
      bucketStart: from,
      queue: succeeded.queue,
      name: succeeded.name,
      succeeded: 1,
      failed: 0,
      cancelled: 0,
    });
    expect(result.processingDuration).toMatchObject({ count: 1, maxMs: 1000 });
    expect(result.oldestWaitMs).toBeGreaterThanOrEqual(10_000);
    expect(result.deadLetters.groups[0]).toMatchObject({ message: "boom" });
  });

  test("uses half-open bounded ranges", async () => {
    const from = new Date("2041-01-01T00:00:00Z");
    const to = new Date("2041-01-01T00:01:00Z");
    const run = await insertRun({ status: "succeeded", createdAt: from });
    await pool.query(
      `UPDATE "_damat_job_runs" SET "completed_at"=$2 WHERE "id"=$1`,
      [run.id, to],
    );
    const result = await inspection().getSummary({
      from,
      to,
      intervalMs: 60_000,
      now: to,
    });
    expect(result.throughput).toHaveLength(0);
  });

  test("rejects unbounded bucket counts before querying", async () => {
    await expect(
      inspection().getSummary({
        from: new Date("2000-01-01T00:00:00Z"),
        to: new Date("2000-01-02T00:00:00Z"),
        intervalMs: 1,
      }),
    ).rejects.toThrow("1,000 buckets");
  });
});
