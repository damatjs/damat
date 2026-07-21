import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("correlates bounded retention request and outcome activity", async () => {
  const seeded = await seedEvent();
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='succeeded',
       "available_at"=NOW()-INTERVAL '2 hours',
       "completed_at"=NOW(),"retention_at"=NOW()-INTERVAL '1 hour'
     WHERE "event_id"=$1`,
    [seeded.event.id],
  );
  await pool.query(
    `UPDATE "_damat_event_outbox" SET "available_at"=NOW()-INTERVAL '2 hours',
       "retention_at"=NOW()-INTERVAL '1 hour'
     WHERE "id"=$1`,
    [seeded.event.id],
  );
  const actor = { id: "operator-4", type: "user" as const };

  const result = await inspectionClient().runRetention(
    { terminalBefore: new Date(), batchSize: 5 },
    actor,
  );

  expect(result.deletedEvents).toBe(1);
  const history = await pool.query(
    `SELECT "status","details" FROM "_damat_maintenance_activity"
     WHERE "operation"='event_retention' ORDER BY "id"`,
  );
  expect(history.rows.map(({ status }) => status)).toEqual([
    "requested",
    "completed",
  ]);
  expect(history.rows[0].details.requestId).toBeString();
  expect(history.rows[1].details.requestId).toBe(
    history.rows[0].details.requestId,
  );
});

test("rejects an explicit zero retention batch", async () => {
  await expect(
    inspectionClient().runRetention(
      { batchSize: 0 },
      { id: "operator-4", type: "user" },
    ),
  ).rejects.toThrow(/limit/);
});
