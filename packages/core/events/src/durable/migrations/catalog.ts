import type { SystemMigrationCatalog } from "@damatjs/durability";
import { events001 } from "./events-001";
import { events002 } from "./events-002";
import { events003 } from "./events-003";
import { events004 } from "./events-004";

export const eventsSystemMigrations: SystemMigrationCatalog = {
  owner: "@damatjs/events",
  migrations: [events001, events002, events003, events004],
};
