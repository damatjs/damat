import { beforeEach, expect, test } from "bun:test";
import { inspectionClient, pool, resetInspectionStorage } from "./fixture";

beforeEach(resetInspectionStorage);

test("worker capacity uses active event workers only", async () => {
  const now = new Date("2026-01-02T12:00:00.000Z");
  await pool.query(
    `INSERT INTO "_damat_workers" ("id","capabilities","hostname","process_id",
       "last_heartbeat_at","stopping_at","stopped_at","concurrency","in_flight")
     VALUES ('active','["events:a"]','host',1,$1,NULL,NULL,4,1),
       ('stale','["events:a"]','host',2,$2,NULL,NULL,8,2),
       ('stopping','["events:a"]','host',3,$1,$1,NULL,16,3),
       ('stopped','["events:a"]','host',4,$1,$1,$1,32,4)`,
    [new Date(now.getTime() - 100), new Date(now.getTime() - 60_000)],
  );

  const summary = await inspectionClient().getSummary({
    from: new Date(now.getTime() - 60_000),
    to: now,
    intervalMs: 30_000,
    now,
    staleAfterMs: 5_000,
  });

  expect(
    summary.workers.records.map(({ id }: { id: string }) => id).sort(),
  ).toEqual(["active", "stale"]);
  expect(summary.workers).toMatchObject({
    concurrency: 4,
    inFlight: 1,
    available: 3,
  });
});
