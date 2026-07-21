export const events001DeliveriesSql = `
CREATE TABLE "_damat_event_deliveries" (
  "id" UUID NOT NULL, "event_id" UUID NOT NULL, "consumer" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "backoff_ms" BIGINT NOT NULL DEFAULT 1000,
  "backoff_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "retention_at" TIMESTAMPTZ NOT NULL,
  "lease_owner" TEXT, "lease_token" UUID, "lease_expires_at" TIMESTAMPTZ,
  "heartbeat_at" TIMESTAMPTZ, "progress" JSONB, "result" JSONB,
  "last_error" JSONB, "cancellation_requested_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "started_at" TIMESTAMPTZ, "completed_at" TIMESTAMPTZ,
  CONSTRAINT "_damat_event_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_event_deliveries_event_fkey" FOREIGN KEY ("event_id")
    REFERENCES "_damat_event_outbox" ("id") ON DELETE CASCADE,
  CONSTRAINT "_damat_event_deliveries_consumer_uidx"
    UNIQUE ("event_id", "consumer"),
  CONSTRAINT "_damat_event_deliveries_identity_uidx"
    UNIQUE ("id", "event_id", "consumer"),
  CONSTRAINT "_damat_event_deliveries_status_check" CHECK ("status" IN
    ('pending','running','retry_wait','succeeded','dead_lettered','cancelled')),
  CONSTRAINT "_damat_event_deliveries_attempt_count_check"
    CHECK ("attempt_count" >= 0),
  CONSTRAINT "_damat_event_deliveries_max_attempts_check"
    CHECK ("max_attempts" > 0),
  CONSTRAINT "_damat_event_deliveries_backoff_ms_check" CHECK ("backoff_ms" >= 0),
  CONSTRAINT "_damat_event_deliveries_backoff_multiplier_check"
    CHECK ("backoff_multiplier" >= 1)
);
CREATE INDEX "_damat_event_deliveries_due_idx" ON "_damat_event_deliveries"
  ("consumer", "status", "available_at", "created_at");
`.trim();
