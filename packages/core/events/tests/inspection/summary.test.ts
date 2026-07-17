import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("summarizes delivery state activity duration leases and worker load", async () => {
  const seeded = await seedEvent(["alpha", "beta"]);
  const now = new Date("2026-01-02T12:00:00.000Z");
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET
       "status"=CASE "consumer" WHEN 'alpha' THEN 'dead_lettered' ELSE 'running' END,
       "lease_expires_at"=CASE "consumer" WHEN 'beta' THEN $2::timestamptz ELSE NULL END,
       "lease_owner"=CASE "consumer" WHEN 'beta' THEN 'worker-a' ELSE NULL END,
       "available_at"=CASE "consumer" WHEN 'alpha' THEN $3::timestamptz
         ELSE $4::timestamptz END,
       "started_at"=CASE "consumer" WHEN 'alpha' THEN $5::timestamptz
         ELSE $6::timestamptz END,
       "completed_at"=CASE "consumer" WHEN 'alpha' THEN $2::timestamptz ELSE NULL END
     WHERE "event_id"=$1`,
    [
      seeded.event.id,
      new Date(now.getTime() - 1_000),
      new Date(now.getTime() - 2_000),
      new Date(now.getTime() - 1_500),
      new Date(now.getTime() - 1_700),
      new Date(now.getTime() - 1_000),
    ],
  );
  await pool.query(
    `INSERT INTO "_damat_event_delivery_attempts"
      ("delivery_id","attempt_number","worker_id","lease_token","started_at",
       "finished_at","duration_ms","outcome","available_at","wait_ms")
     VALUES ($1,1,'worker-a',$2,$3,$4,300,'dead_lettered',$3,300)`,
    [
      seeded.deliveries[0]!.id,
      crypto.randomUUID(),
      new Date(now.getTime() - 2_000),
      new Date(now.getTime() - 1_000),
    ],
  );
  await pool.query(
    `INSERT INTO "_damat_event_activity" ("event_id","delivery_id","consumer",
       "type","next_status","occurred_at")
     VALUES ($1,$2,'alpha','dead_lettered','dead_lettered',$3),
       ($1,$2,'alpha','lease_recovered','dead_lettered',$3)`,
    [seeded.event.id, seeded.deliveries[0]!.id, new Date(now.getTime() - 500)],
  );
  await pool.query(
    `INSERT INTO "_damat_workers" ("id","capabilities","hostname","process_id",
       "concurrency","in_flight","last_heartbeat_at","application","deployment")
     VALUES ('worker-a','["events:test"]','host',1,4,2,$1,$2::jsonb,$3::jsonb)`,
    [
      new Date(now.getTime() - 100),
      '{"secret":"application"}',
      '{"secret":"deployment"}',
    ],
  );

  const summary = await inspectionClient({
    redaction: { keys: ["secret"] },
  }).getSummary({
    from: new Date(now.getTime() - 60_000),
    to: now,
    intervalMs: 30_000,
    now,
    staleAfterMs: 5_000,
  });

  expect(summary.statusCounts).toEqual({ dead_lettered: 1, running: 1 });
  expect(summary.activityCounts.dead_lettered).toBe(1);
  expect(summary.activityCounts.lease_recovered).toBe(1);
  expect(summary.durationMs).toMatchObject({ count: 1, p50: 300, p95: 300 });
  expect(summary.waitingMs).toMatchObject({ count: 1, p50: 300, p95: 300 });
  expect(summary.leases).toEqual({ active: 0, stale: 1 });
  expect(summary.workers).toMatchObject({ concurrency: 4, inFlight: 2 });
  expect(summary.workers.records[0]).toMatchObject({
    application: { secret: "[REDACTED]" },
    deployment: { secret: "[REDACTED]" },
  });
  expect(summary.deadLetters[0]).toMatchObject({ consumer: "alpha", count: 1 });
});

test("rejects an unbounded bucket count before querying", async () => {
  await expect(
    inspectionClient().getSummary({
      from: new Date(0),
      to: new Date(1_001_000),
      intervalMs: 1_000,
    }),
  ).rejects.toThrow("1,000 buckets");
});
