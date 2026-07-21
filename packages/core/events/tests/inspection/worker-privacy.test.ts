import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("hidden visibility omits worker application and deployment metadata", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  await pool.query(
    `INSERT INTO "_damat_workers" ("id","capabilities","hostname","process_id",
       "application","deployment")
     VALUES ('worker-a','["events:test"]','host',1,$1::jsonb,$2::jsonb)`,
    ['{"secret":"application"}', '{"secret":"deployment"}'],
  );
  await pool.query(
    `INSERT INTO "_damat_event_delivery_attempts"
       ("delivery_id","attempt_number","worker_id","lease_token")
     VALUES ($1,1,'worker-a',$2)`,
    [delivery.id, crypto.randomUUID()],
  );
  const options = { redaction: { keys: ["secret"] } };
  const metadata = await inspectionClient(options).getEvent(seeded.event.id);
  const hidden = await inspectionClient({ ...options, visibility: "hidden" });
  const detail = await hidden.getEvent(seeded.event.id);
  const summary = await hidden.getSummary({
    from: new Date(Date.now() - 60_000),
    to: new Date(Date.now() + 60_000),
    intervalMs: 30_000,
  });

  expect(metadata.workers[0].application.secret).toBe("[REDACTED]");
  expect(detail.workers[0]).not.toHaveProperty("application");
  expect(detail.workers[0]).not.toHaveProperty("deployment");
  expect(summary.workers.records[0]).not.toHaveProperty("application");
  expect(summary.workers.records[0]).not.toHaveProperty("deployment");
});
