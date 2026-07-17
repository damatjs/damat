import type { SystemMigration } from "@damatjs/durability";
import { events002AttemptsSql } from "./events-002-attempts";
import { events002ObservabilitySql } from "./events-002-observability";

export const events002: SystemMigration = {
  owner: "@damatjs/events",
  id: "002",
  order: 600,
  sql: [events002AttemptsSql, events002ObservabilitySql].join("\n\n"),
};
