import { expect, test } from "bun:test";
import { eventsSystemMigrations } from "../../src/durable/migrations/catalog";

test("events catalog includes inspection indexes after worker storage", () => {
  const migration = eventsSystemMigrations.migrations.find(
    ({ id }) => id === "004",
  );

  expect(migration?.id).toBe("004");
  expect(migration?.order).toBe(800);
  expect(migration?.sql).toContain("_damat_event_outbox_inspection_idx");
  expect(migration?.sql).toContain('ADD COLUMN "wait_ms"');
  expect(migration?.sql).toContain('WHERE "wait_ms" IS NOT NULL');
  expect(migration?.sql).toContain("_damat_event_outbox_causation_idx");
  expect(migration?.sql).toContain("_damat_event_deliveries_status_idx");
  expect(migration?.sql).toContain("_damat_event_deliveries_owner_idx");
  expect(migration?.sql).toContain("_damat_event_activity_summary_idx");
  expect(migration?.sql).toContain("_damat_event_activity_range_idx");
  expect(migration?.sql).toContain("_damat_event_attempts_summary_idx");
});
