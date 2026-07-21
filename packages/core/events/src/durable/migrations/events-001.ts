import type { SystemMigration } from "@damatjs/durability";
import { events001DeliveriesSql } from "./events-001-deliveries";
import { events001OutboxSql } from "./events-001-outbox";

export const events001: SystemMigration = {
  owner: "@damatjs/events",
  id: "001",
  order: 500,
  sql: [events001OutboxSql, events001DeliveriesSql].join("\n\n"),
};
