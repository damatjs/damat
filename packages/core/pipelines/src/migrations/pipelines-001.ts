import type { SystemMigration } from "@damatjs/durability";
import { pipelines001DefinitionsSql } from "./pipelines-001-definitions";
import { pipelines001IndexesSql } from "./pipelines-001-indexes";
import { pipelines001IntegritySql } from "./pipelines-001-integrity";
import { pipelines001RunsSql } from "./pipelines-001-runs";
import { pipelines001RuntimeSql } from "./pipelines-001-runtime";

export const pipelines001: SystemMigration = {
  owner: "@damatjs/pipelines",
  id: "001",
  order: 1000,
  sql: [
    pipelines001DefinitionsSql,
    pipelines001RunsSql,
    pipelines001RuntimeSql,
    pipelines001IntegritySql,
    pipelines001IndexesSql,
  ].join("\n\n"),
};
