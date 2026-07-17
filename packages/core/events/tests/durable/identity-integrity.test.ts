import { expect, test } from "bun:test";
import { ensureEventStorage, pool } from "./storage-context";
import { publishDurableEvent } from "../../src";

test("activity and logs identities are tied to their delivery", async () => {
  await ensureEventStorage();
  const result = await pool.query<{ name: string; definition: string }>(
    `SELECT conname AS name, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint WHERE conname IN
       ('_damat_event_activity_delivery_identity_fkey',
        '_damat_event_logs_delivery_identity_fkey') ORDER BY conname`,
  );
  expect(result.rows).toHaveLength(2);
  for (const row of result.rows) {
    expect(row.definition).toContain("(delivery_id, event_id, consumer)");
    expect(row.definition).toContain("_damat_event_deliveries");
  }
});

test("outbox snapshots delivery policy with database checks", async () => {
  await ensureEventStorage();
  const result = await pool.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint WHERE conname IN
      ('_damat_event_outbox_max_attempts_check',
       '_damat_event_outbox_backoff_ms_check',
       '_damat_event_outbox_backoff_multiplier_check',
       '_damat_event_outbox_retention_ms_check')`,
  );
  expect(result.rows).toHaveLength(4);
});

test("activity rejects partial delivery identity", async () => {
  await ensureEventStorage();
  const event = await publishDurableEvent(`scope.${crypto.randomUUID()}`, {});
  await expect(
    pool.query(
      `INSERT INTO "_damat_event_activity"
        ("event_id","delivery_id","type") VALUES ($1,$2,'invalid')`,
      [event.id, crypto.randomUUID()],
    ),
  ).rejects.toThrow(/delivery_scope_check/);
});
