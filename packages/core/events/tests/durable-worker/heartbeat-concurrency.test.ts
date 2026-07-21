import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  completeEventDeliverySuccess,
  heartbeatEventDelivery,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("concurrent heartbeat and success share one lock order", async () => {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "lock-order-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  await installAttemptDelay(claim!.id);
  try {
    const heartbeat = heartbeatEventDelivery(claim!, { leaseMs: 30_000 });
    await Bun.sleep(30);
    const success = completeEventDeliverySuccess(claim!, { ok: true });
    const settled = await Promise.allSettled([heartbeat, success]);
    expect(settled.map(({ status }) => status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);
    expect((await deliveryRow(item.id)).status).toBe("succeeded");
  } finally {
    await removeAttemptDelay();
  }
});

async function installAttemptDelay(deliveryId: string) {
  await pool.query(`CREATE OR REPLACE FUNCTION delay_event_attempt() RETURNS
    trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.delivery_id='${deliveryId}'::uuid AND NEW.heartbeat_at IS DISTINCT
        FROM OLD.heartbeat_at THEN PERFORM pg_sleep(0.2); END IF;
      RETURN NEW; END $$`);
  await pool.query(`CREATE TRIGGER delay_event_attempt_update BEFORE UPDATE ON
    "_damat_event_delivery_attempts" FOR EACH ROW
    EXECUTE FUNCTION delay_event_attempt()`);
}

async function removeAttemptDelay() {
  await pool.query(`DROP TRIGGER IF EXISTS delay_event_attempt_update ON
    "_damat_event_delivery_attempts"`);
  await pool.query(`DROP FUNCTION IF EXISTS delay_event_attempt()`);
}
