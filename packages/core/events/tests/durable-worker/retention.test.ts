import { beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  publishDurableEvent,
  routeDurableEvents,
  runEventRetention,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";
import { seedDelivery } from "./fixture";

const actor = { id: "retention-test", type: "system" as const };

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("retention removes routed zero-consumer events and audits atomically", async () => {
  await publishDurableEvent(uniqueEvent("expired"), {});
  await routeDurableEvents();
  expect(
    await runEventRetention({
      actor,
      batchSize: 10,
      terminalBefore: new Date(Date.now() + 700_000_000),
    }),
  ).toMatchObject({
    deletedEvents: 1,
  });
  const audit = await pool.query(
    `SELECT "status" FROM "_damat_maintenance_activity"
     WHERE "operation"='event_retention' ORDER BY "id" DESC LIMIT 1`,
  );
  expect(audit.rows[0].status).toBe("completed");
});

test("retention preserves unrouted and active delivery events", async () => {
  const active = await seedDelivery();
  const unrouted = await publishDurableEvent(uniqueEvent("unrouted"), {});
  await runEventRetention({
    actor,
    batchSize: 10,
    terminalBefore: new Date(Date.now() + 700_000_000),
  });
  const rows = await pool.query(
    `SELECT "id" FROM "_damat_event_outbox" WHERE "id" IN ($1,$2)`,
    [unrouted.id, active.eventId],
  );
  expect(rows.rows).toHaveLength(2);
});
