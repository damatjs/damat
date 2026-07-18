import type { SystemMigration } from "@damatjs/durability";

export const events005: SystemMigration = {
  owner: "@damatjs/events",
  id: "005",
  order: 900,
  sql: `ALTER TABLE "_damat_event_outbox"
    ALTER COLUMN "retention_ms" DROP NOT NULL,
    ALTER COLUMN "retention_at" DROP NOT NULL;
  ALTER TABLE "_damat_event_deliveries"
    ALTER COLUMN "retention_at" DROP NOT NULL`,
};
