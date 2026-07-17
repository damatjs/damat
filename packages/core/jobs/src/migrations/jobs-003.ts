import type { SystemMigration } from "@damatjs/durability";
import { jobs003ObservabilitySql } from "./jobs-003-observability";
import { jobs003RunsSql } from "./jobs-003-runs";

export const jobs003: SystemMigration = {
  owner: "@damatjs/jobs",
  id: "003",
  order: 450,
  sql: [jobs003RunsSql, jobs003ObservabilitySql].join("\n\n"),
};
