import { beforeAll, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

test("detail explicitly reports bounded queue-control history", async () => {
  const run = await insertRun({});
  await pool.query(
    `INSERT INTO "_damat_work_control_activity"
       ("work_kind","scope","action","actor","created_at")
     SELECT 'job',$1,CASE WHEN n%2=0 THEN 'paused' ELSE 'resumed' END,
       '{"id":"seed","type":"system"}'::jsonb,NOW()+n*INTERVAL '1 ms'
     FROM generate_series(1,501) n`,
    [run.queue],
  );
  const detail = await inspection().getRun(run.id);
  expect(detail?.controlActivity).toHaveLength(500);
  expect(detail?.controlHistoryTruncated).toBe(true);

  const fresh = await insertRun({});
  const freshDetail = await inspection().getRun(fresh.id);
  expect(freshDetail?.controlHistoryTruncated).toBe(false);
});
