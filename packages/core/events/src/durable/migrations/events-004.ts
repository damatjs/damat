import type { SystemMigration } from "@damatjs/durability";

export const events004: SystemMigration = {
  owner: "@damatjs/events",
  id: "004",
  order: 800,
  sql: `ALTER TABLE "_damat_event_delivery_attempts"
    ADD COLUMN "available_at" TIMESTAMPTZ,
    ADD COLUMN "wait_ms" BIGINT,
    ADD CONSTRAINT "_damat_event_attempts_wait_ms_check"
      CHECK ("wait_ms" IS NULL OR "wait_ms" >= 0);
  CREATE INDEX "_damat_event_outbox_inspection_idx"
    ON "_damat_event_outbox"
    (date_trunc('milliseconds', "created_at" AT TIME ZONE 'UTC') DESC, "id" DESC);
  CREATE INDEX "_damat_event_outbox_lineage_idx"
    ON "_damat_event_outbox" ("correlation_id", "causation_id", "created_at");
  CREATE INDEX "_damat_event_outbox_causation_idx"
    ON "_damat_event_outbox" ("causation_id", "created_at")
    WHERE "causation_id" IS NOT NULL;
  CREATE INDEX "_damat_event_outbox_idempotency_idx"
    ON "_damat_event_outbox" ("idempotency_key", "created_at")
    WHERE "idempotency_key" IS NOT NULL;
  CREATE INDEX "_damat_event_deliveries_status_idx"
    ON "_damat_event_deliveries" ("status", "created_at", "id");
  CREATE INDEX "_damat_event_deliveries_lease_idx"
    ON "_damat_event_deliveries" ("lease_expires_at", "lease_owner")
    WHERE "status" = 'running';
  CREATE INDEX "_damat_event_deliveries_owner_idx"
    ON "_damat_event_deliveries" ("lease_owner", "lease_expires_at", "id")
    WHERE "lease_owner" IS NOT NULL;
  CREATE INDEX "_damat_event_deliveries_terminal_idx"
    ON "_damat_event_deliveries" ("completed_at", "status")
    WHERE "completed_at" IS NOT NULL;
  CREATE INDEX "_damat_event_activity_summary_idx"
    ON "_damat_event_activity" ("type", "occurred_at", "event_id");
  CREATE INDEX "_damat_event_activity_range_idx"
    ON "_damat_event_activity" ("occurred_at", "type", "event_id");
  CREATE INDEX "_damat_event_attempts_summary_idx"
    ON "_damat_event_delivery_attempts" ("finished_at", "outcome", "duration_ms")
    WHERE "finished_at" IS NOT NULL;
  CREATE INDEX "_damat_event_attempts_waiting_idx"
    ON "_damat_event_delivery_attempts" ("started_at", "wait_ms")
    WHERE "wait_ms" IS NOT NULL;`,
};
