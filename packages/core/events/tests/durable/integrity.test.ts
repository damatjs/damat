import { expect, test } from "bun:test";
import { ensureEventStorage, pool } from "./storage-context";

test("event schema scopes idempotency and consumer uniqueness", async () => {
  await ensureEventStorage();
  const result = await pool.query<{ name: string; definition: string }>(
    `SELECT conname AS name, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint WHERE conname IN
       ('_damat_event_outbox_idempotency_uidx',
        '_damat_event_deliveries_consumer_uidx') ORDER BY conname`,
  );
  expect(result.rows).toEqual([
    {
      name: "_damat_event_deliveries_consumer_uidx",
      definition: "UNIQUE (event_id, consumer)",
    },
    {
      name: "_damat_event_outbox_idempotency_uidx",
      definition: "UNIQUE (name, idempotency_key)",
    },
  ]);
});

test("attempt-scoped activity and logs require a real attempt", async () => {
  await ensureEventStorage();
  const result = await pool.query<{ name: string; definition: string }>(
    `SELECT conname AS name, pg_get_constraintdef(oid) AS definition
     FROM pg_constraint WHERE conname IN
       ('_damat_event_activity_attempt_fkey',
        '_damat_event_logs_attempt_fkey') ORDER BY conname`,
  );
  expect(result.rows).toHaveLength(2);
  for (const row of result.rows) {
    expect(row.definition).toContain("(delivery_id, attempt_number)");
    expect(row.definition).toContain("_damat_event_delivery_attempts");
  }
});

test("delivery lifecycle checks and due indexes are present", async () => {
  await ensureEventStorage();
  const checks = await pool.query<{ conname: string }>(
    `SELECT conname FROM pg_constraint WHERE conname IN
      ('_damat_event_deliveries_status_check',
       '_damat_event_activity_status_check') ORDER BY conname`,
  );
  const indexes = await pool.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE indexname IN
      ('_damat_event_outbox_due_idx','_damat_event_deliveries_due_idx')
     ORDER BY indexname`,
  );
  expect(checks.rows).toHaveLength(2);
  expect(indexes.rows).toHaveLength(2);
});
