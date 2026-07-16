import type { SystemMigration } from "@damatjs/durability";
import { jobs001AttemptsSql } from "./jobs-001-attempts";
import { jobs001ObservabilitySql } from "./jobs-001-observability";
import { jobs001RunsSql } from "./jobs-001-runs";

export const jobs001: SystemMigration = {
  owner: "@damatjs/jobs",
  id: "001",
  order: 300,
  sql: [jobs001RunsSql, jobs001AttemptsSql, jobs001ObservabilitySql].join(
    "\n\n",
  ),
};
