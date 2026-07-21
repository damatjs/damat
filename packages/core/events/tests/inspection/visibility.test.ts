import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("metadata and hidden visibility strip payload and results only", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "progress"=$2::jsonb,
       "result"=$3::jsonb,"last_error"=$4::jsonb WHERE "id"=$1`,
    [
      delivery.id,
      '{"secret":"progress"}',
      '{"secret":"result"}',
      '{"secret":"error"}',
    ],
  );
  await pool.query(
    `INSERT INTO "_damat_event_delivery_attempts"
      ("delivery_id","attempt_number","worker_id","lease_token","result","error")
     VALUES ($1,1,'worker-a',$2,$3::jsonb,$4::jsonb)`,
    [delivery.id, crypto.randomUUID(), '{"secret":"attempt"}', "{}"],
  );
  const options = { redaction: { keys: ["secret"] } };

  const metadata = await inspectionClient(options).getEvent(seeded.event.id);
  const hidden = await inspectionClient({
    ...options,
    visibility: "hidden",
  }).getEvent(seeded.event.id);

  expect(metadata.payload).toBeUndefined();
  expect(metadata.metadata?.public).toBe("yes");
  expect(metadata.deliveries[0].result).toBeUndefined();
  expect(metadata.deliveries[0].attempts[0].result).toBeUndefined();
  expect(metadata.deliveries[0].progress.secret).toBe("[REDACTED]");
  expect(metadata.deliveries[0].lastError.secret).toBe("[REDACTED]");
  expect(hidden.payload).toBeUndefined();
  expect(hidden.metadata).toBeUndefined();
  expect(hidden.deliveries[0].result).toBeUndefined();
  expect(hidden.deliveries[0].progress.secret).toBe("[REDACTED]");
});
