import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);
const actor = { id: "operator", type: "user" as const };

test("manual retry and retention serialize child before parent", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='dead_lettered',
       "completed_at"=NOW(),"available_at"=NOW()-INTERVAL '2 hours',
       "retention_at"=NOW()-INTERVAL '1 hour'
     WHERE "id"=$1`,
    [delivery.id],
  );
  await pool.query(
    `UPDATE "_damat_event_outbox" SET "available_at"=NOW()-INTERVAL '2 hours',
       "retention_at"=NOW()-INTERVAL '1 hour'
     WHERE "id"=$1`,
    [seeded.event.id],
  );
  const client = inspectionClient();

  const results = await Promise.allSettled([
    client.retryDelivery(delivery.id, actor),
    client.runRetention({ terminalBefore: new Date() }, actor),
  ]);

  expect(results.every((result) => !isDeadlock(result))).toBe(true);
  expect(results.some(({ status }) => status === "fulfilled")).toBe(true);
});

function isDeadlock(result: PromiseSettledResult<unknown>) {
  return (
    result.status === "rejected" &&
    String(result.reason?.message ?? result.reason).includes("deadlock")
  );
}
