import type { SystemMigration } from "@damatjs/durability";

export const events003: SystemMigration = {
  owner: "@damatjs/events",
  id: "003",
  order: 700,
  sql: `UPDATE "_damat_event_deliveries"
    SET "retention_at" = "available_at"
    WHERE "retention_at" < "available_at";
  ALTER TABLE "_damat_event_deliveries"
    ADD CONSTRAINT "_damat_event_deliveries_retention_at_check"
    CHECK ("retention_at" >= "available_at")`,
};
