import { beforeAll, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

test("summary redacts failure messages for non-full visibility", async () => {
  const from = new Date("2051-01-01T00:00:00Z");
  const to = new Date("2051-01-01T01:00:00Z");
  await pool.query(
    `DELETE FROM "_damat_job_runs" WHERE "created_at">=$1 AND "created_at"<$2`,
    [from, to],
  );
  const run = await insertRun({ status: "dead_lettered", createdAt: from });
  await pool.query(
    `UPDATE "_damat_job_runs" SET "completed_at"=$2,
       "last_error"='{"message":"private failure"}' WHERE "id"=$1`,
    [run.id, new Date(from.getTime() + 1_000)],
  );
  const filter = { from, to, intervalMs: 60_000, now: to };
  for (const visibility of ["metadata", "hidden"] as const) {
    const result = await inspection({
      visibility,
      redaction: { keys: ["message"] },
    }).getSummary(filter);
    expect(result.deadLetters.groups[0]?.message).toBe("[REDACTED]");
  }
});
