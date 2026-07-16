import type { SystemMigrationCatalog } from "@damatjs/durability";
import { jobs001 } from "./jobs-001";
import { jobs002 } from "./jobs-002";

export const jobsSystemMigrations: SystemMigrationCatalog = {
  owner: "@damatjs/jobs",
  migrations: [jobs001, jobs002],
};
