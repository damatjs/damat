export const events001OutboxSql = `
CREATE TABLE "_damat_event_outbox" (
  "id" UUID NOT NULL, "name" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "policy_version" INTEGER NOT NULL DEFAULT 1,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "backoff_ms" BIGINT NOT NULL DEFAULT 1000,
  "backoff_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
  "retention_ms" BIGINT NOT NULL,
  "idempotency_key" TEXT, "correlation_id" TEXT, "causation_id" TEXT,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "routed_at" TIMESTAMPTZ, "retention_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "_damat_event_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_event_outbox_policy_version_check"
    CHECK ("policy_version" > 0),
  CONSTRAINT "_damat_event_outbox_max_attempts_check" CHECK ("max_attempts" > 0),
  CONSTRAINT "_damat_event_outbox_backoff_ms_check" CHECK ("backoff_ms" >= 0),
  CONSTRAINT "_damat_event_outbox_backoff_multiplier_check"
    CHECK ("backoff_multiplier" >= 1),
  CONSTRAINT "_damat_event_outbox_retention_ms_check" CHECK ("retention_ms" >= 0),
  CONSTRAINT "_damat_event_outbox_retention_at_check"
    CHECK ("retention_at" >= "available_at"),
  CONSTRAINT "_damat_event_outbox_idempotency_uidx"
    UNIQUE ("name", "idempotency_key")
);
CREATE INDEX "_damat_event_outbox_due_idx" ON "_damat_event_outbox"
  ("available_at", "created_at") WHERE "routed_at" IS NULL;
CREATE INDEX "_damat_event_outbox_name_idx" ON "_damat_event_outbox"
  ("name", "created_at");
`.trim();
