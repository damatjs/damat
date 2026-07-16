import { beforeAll, describe, expect, test } from "bun:test";
import { runJobRetention } from "../../src/worker/retention";
import { pool, prepareWorkerTest, queuedRun } from "../worker/context";

beforeAll(prepareWorkerTest);

describe("job retention", () => {
  test("requires an attributed actor", async () => {
    await expect(runJobRetention(undefined as never)).rejects.toThrow(
      "retention options are required",
    );
    await expect(
      runJobRetention({ actor: { id: "", type: "system" } }),
    ).rejects.toThrow("actor id must not be blank");
  });

  test("bounds terminal deletion and preserves active work", async () => {
    const queue = `retention-${crypto.randomUUID()}`;
    const first = await queuedRun(queue);
    const second = await queuedRun(queue);
    const active = await queuedRun(queue);
    const actor = { id: crypto.randomUUID(), type: "system" as const };
    await pool.query(
      `UPDATE "_damat_job_runs" SET "status"='succeeded',
       "completed_at"='2000-01-01T00:00:00Z' WHERE "id"=ANY($1::uuid[])`,
      [[first.run.id, second.run.id]],
    );

    const result = await runJobRetention({
      terminalBefore: new Date("2001-01-01T00:00:00Z"),
      batchSize: 1,
      actor,
      queue,
    });
    expect(result.deletedRuns).toBe(1);
    const remaining = await pool.query(
      `SELECT "id" FROM "_damat_job_runs" WHERE "id"=ANY($1::uuid[])`,
      [[first.run.id, second.run.id, active.run.id]],
    );
    expect(remaining.rowCount).toBe(2);
    expect(remaining.rows.some(({ id }) => id === active.run.id)).toBe(true);
    const audit = await pool.query(
      `SELECT "status","details" FROM "_damat_maintenance_activity"
       WHERE "actor"->>'id'=$1 ORDER BY "id"`,
      [actor.id],
    );
    expect(audit.rows.map(({ status }) => status)).toEqual([
      "requested",
      "completed",
    ]);
    expect(audit.rows[1]!.details.deletedRuns).toBe(1);
  });

  test("removes expired deduplication in bounded batches", async () => {
    const queue = `dedup-retention-${crypto.randomUUID()}`;
    const one = await queuedRun(queue);
    const two = await queuedRun(queue);
    for (const [key, run] of [
      ["one", one.run],
      ["two", two.run],
    ] as const) {
      await pool.query(
        `INSERT INTO "_damat_job_deduplication"
         ("queue","job_name","deduplication_key","run_id","expires_at")
         VALUES ($1,$2,$3,$4,NOW()-INTERVAL '1 second')`,
        [run.queue, run.name, key, run.id],
      );
    }
    const result = await runJobRetention({
      batchSize: 1,
      actor: { id: crypto.randomUUID(), type: "system" },
      queue,
    });
    expect(result.deletedDeduplication).toBe(1);
    const remaining = await pool.query(
      `SELECT 1 FROM "_damat_job_deduplication"
       WHERE "run_id"=ANY($1::uuid[])`,
      [[one.run.id, two.run.id]],
    );
    expect(remaining.rowCount).toBe(1);
  });
});
