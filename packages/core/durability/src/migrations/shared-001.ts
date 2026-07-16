import type { SystemMigration } from "./types";

const OWNER = "@damatjs/durability";

export const shared001: SystemMigration = {
  owner: OWNER,
  id: "001",
  order: 100,
  sql: `
CREATE TABLE "_damat_idempotency_keys" (
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "result" JSONB,
  "operation" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  CONSTRAINT "_damat_idempotency_keys_pkey" PRIMARY KEY ("scope", "key"),
  CONSTRAINT "_damat_idempotency_keys_status_check"
    CHECK ("status" IN ('running', 'completed'))
);
CREATE INDEX "_damat_idempotency_keys_expires_at_idx"
  ON "_damat_idempotency_keys" ("expires_at");

CREATE TABLE "_damat_workers" (
  "id" TEXT NOT NULL,
  "capabilities" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "hostname" TEXT NOT NULL,
  "process_id" INTEGER NOT NULL,
  "application" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "deployment" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "last_heartbeat_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "stopping_at" TIMESTAMPTZ,
  "stopped_at" TIMESTAMPTZ,
  "concurrency" INTEGER NOT NULL DEFAULT 1,
  "in_flight" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "_damat_workers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_workers_concurrency_check" CHECK ("concurrency" > 0),
  CONSTRAINT "_damat_workers_in_flight_check" CHECK ("in_flight" >= 0)
);
CREATE INDEX "_damat_workers_heartbeat_idx"
  ON "_damat_workers" ("last_heartbeat_at");
`.trim(),
};
