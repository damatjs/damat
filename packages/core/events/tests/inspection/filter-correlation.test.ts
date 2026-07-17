import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("delivery filters and failed range match the same consumer", async () => {
  const seeded = await seedEvent(["alpha", "beta"]);
  const alpha = seeded.deliveries.find(({ consumer }) => consumer === "alpha")!;
  const beta = seeded.deliveries.find(({ consumer }) => consumer === "beta")!;
  const now = new Date();
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"=CASE "consumer"
       WHEN 'alpha' THEN 'running' ELSE 'dead_lettered' END,
       "lease_owner"=CASE "consumer" WHEN 'alpha' THEN 'worker-a' END,
       "completed_at"=CASE "consumer" WHEN 'beta' THEN $2::timestamptz END
     WHERE "event_id"=$1`,
    [seeded.event.id, now],
  );
  await pool.query(
    `INSERT INTO "_damat_event_activity"
       ("event_id","delivery_id","consumer","type","occurred_at")
     VALUES ($1,$2,'beta','dead_lettered',$3)`,
    [seeded.event.id, beta.id, now],
  );
  const failed = {
    from: new Date(now.getTime() - 1_000),
    to: new Date(now.getTime() + 1_000),
  };
  const client = inspectionClient();

  expect(
    (await client.listEvents({ consumers: [alpha.consumer], failed })).items,
  ).toEqual([]);
  expect(
    (await client.listEvents({ consumers: [beta.consumer], failed })).items[0]
      ?.id,
  ).toBe(seeded.event.id);
});
