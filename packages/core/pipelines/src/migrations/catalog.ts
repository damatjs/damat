import type { SystemMigrationCatalog } from "@damatjs/durability";
import { pipelines001 } from "./pipelines-001";

export const pipelinesSystemMigrations: SystemMigrationCatalog = {
  owner: "@damatjs/pipelines",
  migrations: [pipelines001],
};
