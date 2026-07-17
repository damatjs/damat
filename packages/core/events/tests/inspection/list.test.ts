import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("lists event-level delivery counts and orthogonal recovered state", async () => {
  const seeded = await seedEvent(["alpha", "beta"]);
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"=CASE "consumer"
       WHEN 'alpha' THEN 'running' ELSE 'retry_wait' END
     WHERE "event_id"=$1`,
    [seeded.event.id],
  );
  await pool.query(
    `INSERT INTO "_damat_event_activity" ("event_id","type")
     VALUES ($1,'lease_recovered')`,
    [seeded.event.id],
  );

  const page = await inspectionClient({
    redaction: { keys: ["secret"] },
  }).listEvents({ names: [seeded.name], recovered: true });

  expect(page.items).toHaveLength(1);
  expect(page.items[0].deliveryCounts).toEqual({ running: 1, retry_wait: 1 });
  expect(page.items[0].views).toEqual(
    expect.arrayContaining(["processing", "retrying"]),
  );
  expect(page.items[0].recovered).toBe(true);
  expect(page.items[0].payload).toBeUndefined();
  expect(page.items[0].metadata.secret).toBe("[REDACTED]");
});
