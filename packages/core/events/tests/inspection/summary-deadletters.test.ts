import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("dead-letter groups are deterministically capped at twenty", async () => {
  const events = [];
  for (let index = 0; index < 21; index += 1) events.push(await seedEvent());
  const now = new Date();
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='dead_lettered',
       "completed_at"=$2 WHERE "event_id"=ANY($1::uuid[])`,
    [events.map(({ event }) => event.id), now],
  );

  const summary = await inspectionClient().getSummary({
    from: new Date(now.getTime() - 60_000),
    to: new Date(now.getTime() + 60_000),
    intervalMs: 30_000,
  });

  expect(summary.deadLetters).toHaveLength(20);
  expect(summary.deadLetters.map(({ event }) => event)).toEqual(
    events
      .map(({ name }) => name)
      .sort()
      .slice(0, 20),
  );
});
