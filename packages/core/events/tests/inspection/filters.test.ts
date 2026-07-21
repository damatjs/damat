import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("supports every event and delivery inspection filter", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  const now = new Date();
  await pool.query(
    `UPDATE "_damat_event_outbox" SET "causation_id"='cause-a',
       "idempotency_key"='key-a' WHERE "id"=$1`,
    [seeded.event.id],
  );
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='running',
       "lease_owner"='worker-a',"lease_token"=$2,
       "lease_expires_at"=$3,"started_at"=$4,"completed_at"=$4
     WHERE "id"=$1`,
    [delivery.id, crypto.randomUUID(), new Date(now.getTime() + 60_000), now],
  );
  await pool.query(
    `INSERT INTO "_damat_event_activity"
      ("event_id","delivery_id","consumer","type","occurred_at")
     VALUES ($1,$2,'alpha','dead_lettered',$3)`,
    [seeded.event.id, delivery.id, now],
  );
  const around = {
    from: new Date(now.getTime() - 60_000),
    to: new Date(now.getTime() + 60_000),
  };
  const filters = [
    { names: [seeded.name] },
    { consumers: [delivery.consumer] },
    { statuses: ["running"] },
    { views: ["processing"] },
    { recovered: false },
    { workerId: "worker-a" },
    { leaseState: "active", now },
    { correlationId: seeded.event.correlationId },
    { causationId: "cause-a" },
    { idempotencyKey: "key-a" },
    { created: around },
    { available: around },
    { started: around },
    { finished: around },
    { failed: around },
  ];
  const client = inspectionClient();
  for (const filter of filters) {
    expect((await client.listEvents(filter)).items.map(({ id }) => id)).toEqual(
      [seeded.event.id],
    );
  }
  expect((await client.listEvents({ statuses: ["succeeded"] })).items).toEqual(
    [],
  );
});
