import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("returns redacted payload and complete delivery history", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  await pool.query(
    `INSERT INTO "_damat_event_delivery_attempts"
      ("delivery_id","attempt_number","worker_id","lease_token","outcome")
     VALUES ($1,1,'worker-a',$2,'succeeded')`,
    [delivery.id, crypto.randomUUID()],
  );
  await pool.query(
    `INSERT INTO "_damat_event_logs"
      ("event_id","delivery_id","attempt_number","consumer","level",
       "message","context","sequence")
     VALUES ($1,$2,1,$3,'info','handled',$4::jsonb,1)`,
    [seeded.event.id, delivery.id, delivery.consumer, '{"secret":"log"}'],
  );
  await pool.query(
    `INSERT INTO "_damat_workers" ("id","capabilities","hostname","process_id",
       "application","deployment")
     VALUES ('worker-a','[]','host',1,$1::jsonb,$2::jsonb)`,
    ['{"secret":"application"}', '{"secret":"deployment"}'],
  );
  const client = inspectionClient({
    visibility: "full",
    redaction: { keys: ["secret"] },
  });
  await client.pauseConsumer(seeded.name, "alpha", {
    id: "operator",
    type: "user",
    metadata: { secret: "actor" },
  });

  const detail = await client.getEvent(seeded.event.id);

  expect(detail.payload.secret).toBe("[REDACTED]");
  expect(detail.deliveries[0].attempts).toHaveLength(1);
  expect(detail.deliveries[0].logs[0].context.secret).toBe("[REDACTED]");
  expect(detail.workers[0].application.secret).toBe("[REDACTED]");
  expect(detail.workers[0].deployment.secret).toBe("[REDACTED]");
  expect(detail.controls[0].actor.metadata.secret).toBe("[REDACTED]");
  expect(detail.activity.map(({ type }: { type: string }) => type)).toEqual(
    expect.arrayContaining(["published", "routed", "pending"]),
  );
});
