import { beforeAll, describe, expect, test } from "bun:test";
import { registerWorker } from "@damatjs/durability";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

describe("job inspection detail", () => {
  test("returns redacted payload and complete execution history", async () => {
    const run = await insertRun({ payload: { token: "secret", safe: true } });
    const token = crypto.randomUUID();
    await registerWorker({
      id: `detail-worker-${crypto.randomUUID()}`,
      capabilities: [`jobs:${run.queue}`],
      hostname: "test",
      processId: 1,
      concurrency: 1,
    });
    const workerId = `history-worker-${crypto.randomUUID()}`;
    await pool.query(
      `UPDATE "_damat_job_runs" SET "status"='running',"attempt_count"=1,
       "lease_owner"=$2,"lease_token"=$3,"lease_expires_at"=NOW()+INTERVAL '1 minute'
       WHERE "id"=$1`,
      [run.id, workerId, token],
    );
    await pool.query(
      `INSERT INTO "_damat_job_attempts"
       ("run_id","attempt_number","worker_id","lease_token","heartbeat_at")
       VALUES ($1,1,$2,$3,NOW())`,
      [run.id, workerId, token],
    );
    await pool.query(
      `INSERT INTO "_damat_job_activity"
       ("run_id","attempt_number","type","worker_id","lease_token")
       VALUES ($1,1,'claimed',$2,$3),($1,1,'logs_truncated',$2,$3)`,
      [run.id, workerId, token],
    );
    await pool.query(
      `INSERT INTO "_damat_job_logs"
       ("run_id","attempt_number","level","message","context","sequence")
       VALUES ($1,1,'info','hello','{"token":"secret"}',1)`,
      [run.id],
    );
    const detail = await inspection({
      visibility: "full",
      redaction: { keys: ["token"] },
    }).getRun(run.id);
    expect(detail).toMatchObject({
      id: run.id,
      payload: { token: "[REDACTED]", safe: true },
      logsTruncated: true,
      currentLease: { workerId, leaseToken: token, state: "active" },
    });
    expect(detail?.attempts).toHaveLength(1);
    expect(detail?.logs[0]?.context.token).toBe("[REDACTED]");
    expect(detail?.leaseHistory[0]).toMatchObject({ workerId });
  });

  test("returns null for an unknown run", async () => {
    expect(await inspection().getRun(crypto.randomUUID())).toBeNull();
  });
});
