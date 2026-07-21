import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("dead-letter groups use the bounded summary range", async () => {
  const inside = await seedEvent();
  const outside = await seedEvent();
  const now = new Date("2026-01-02T12:00:00.000Z");
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='dead_lettered',
       "completed_at"=CASE "event_id" WHEN $1 THEN $3::timestamptz
         ELSE $4::timestamptz END
     WHERE "event_id" IN ($1,$2)`,
    [
      inside.event.id,
      outside.event.id,
      new Date(now.getTime() - 1_000),
      new Date(now.getTime() - 7_200_000),
    ],
  );

  const summary = await inspectionClient().getSummary({
    from: new Date(now.getTime() - 3_600_000),
    to: now,
    intervalMs: 60_000,
    now,
  });

  expect(
    summary.deadLetters.map(({ event }: { event: string }) => event),
  ).toEqual([inside.name]);
});
