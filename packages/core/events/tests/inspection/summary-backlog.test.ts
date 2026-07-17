import { beforeEach, expect, test } from "bun:test";
import { defineDurableEvent, publishDurableEvent } from "../../src";
import { inspectionClient, pool, resetInspectionStorage } from "./fixture";

beforeEach(resetInspectionStorage);

test("oldest wait includes overdue unrouted outbox events", async () => {
  const name = `backlog.${crypto.randomUUID()}`;
  const now = new Date("2026-01-02T12:00:00.000Z");
  defineDurableEvent(name);
  const event = await publishDurableEvent(name, {});
  await pool.query(
    `UPDATE "_damat_event_outbox" SET "available_at"=$2 WHERE "id"=$1`,
    [event.id, new Date(now.getTime() - 5_000)],
  );

  const summary = await inspectionClient().getSummary({
    from: new Date(now.getTime() - 60_000),
    to: now,
    intervalMs: 30_000,
    now,
  });

  expect(summary.oldestWaitMs).toBe(5_000);
});
