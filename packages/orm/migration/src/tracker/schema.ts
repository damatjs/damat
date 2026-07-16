export const MIGRATION_TRACKER_TABLE = "_damat_migration_logs";

export const MIGRATION_TRACKER_SCHEMA = `
CREATE TABLE IF NOT EXISTS "${MIGRATION_TRACKER_TABLE}" (
  "id" TEXT PRIMARY KEY,
  "module" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reverted_at" TIMESTAMPTZ,
  "execution_time_ms" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'applied',
  UNIQUE ("module", "name")
);
CREATE INDEX IF NOT EXISTS "idx__damat_migration_logs_module"
  ON "_damat_migration_logs" ("module");
CREATE INDEX IF NOT EXISTS "idx__damat_migration_logs_status"
  ON "_damat_migration_logs" ("status");
`;
