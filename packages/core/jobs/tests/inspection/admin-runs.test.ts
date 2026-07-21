import { beforeAll, describe, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

const actor = { id: "operator-1", type: "user" as const };

describe("job inspection run administration", () => {
  test("requires actors and audits cancellation", async () => {
    const run = await insertRun({ status: "queued" });
    const client = inspection();
    await expect(client.cancel(run.id, undefined as never)).rejects.toThrow(
      "actor is required",
    );
    const first = await client.cancel(run.id, actor, "requested");
    expect(first).toMatchObject({ status: "cancelled" });
    expect(first.cancellationRequestedAt).toBeInstanceOf(Date);
    expect((await client.cancel(run.id, actor)).id).toBe(run.id);
    const activity = await pool.query(
      `SELECT "actor","reason" FROM "_damat_job_activity"
       WHERE "run_id"=$1 AND "type"='cancelled'`,
      [run.id],
    );
    expect(activity.rowCount).toBe(1);
    expect(activity.rows[0]).toMatchObject({ actor, reason: "requested" });
  });

  test("retries only dead letters and preserves history", async () => {
    const run = await insertRun({ status: "dead_lettered" });
    await pool.query(
      `UPDATE "_damat_job_runs" SET "completed_at"=NOW(),
       "progress"='{"old":true}',"result"='{"old":true}',
       "last_error"='{"message":"old"}',"cancellation_requested_at"=NOW(),
       "lease_owner"='old-worker',"lease_token"=$2,
       "lease_expires_at"=NOW(),"heartbeat_at"=NOW() WHERE "id"=$1`,
      [run.id, crypto.randomUUID()],
    );
    const client = inspection();
    expect((await client.retry(run.id, actor)).status).toBe("queued");
    const cleaned = await pool.query(
      `SELECT "progress","result","last_error","cancellation_requested_at",
       "completed_at","lease_owner","lease_token","lease_expires_at","heartbeat_at"
       FROM "_damat_job_runs" WHERE "id"=$1`,
      [run.id],
    );
    expect(Object.values(cleaned.rows[0])).toEqual(Array(9).fill(null));
    await expect(client.retry(run.id, actor)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    const activity = await pool.query(
      `SELECT "actor","metadata" FROM "_damat_job_activity"
       WHERE "run_id"=$1 AND "type"='manual_retry'`,
      [run.id],
    );
    expect(activity.rowCount).toBe(1);
    expect(activity.rows[0].actor).toEqual(actor);
    expect(activity.rows[0].metadata.availableAt).toBeString();
  });

  test("uses typed not-found errors", async () => {
    await expect(
      inspection().cancel(crypto.randomUUID(), actor),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("rejects cancellation of settled successful and failed jobs", async () => {
    for (const status of ["succeeded", "dead_lettered"] as const) {
      const run = await insertRun({ status });
      await expect(inspection().cancel(run.id, actor)).rejects.toMatchObject({
        code: "INVALID_TRANSITION",
      });
    }
  });
});
