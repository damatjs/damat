import type { SystemMigrationCatalog } from "@damatjs/durability";
import { events001 } from "./events-001";
import { events002 } from "./events-002";

export const eventsSystemMigrations: SystemMigrationCatalog = {
  owner: "@damatjs/events",
  migrations: [events001, events002],
};
