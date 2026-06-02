import type { Command } from "@damatjs/cli";
import migrateUp from "./up";
import migrateStatus from "./status";
import migrateList from "./list";
import migrateCreate from "./create";

const commands = [migrateUp, migrateStatus, migrateList, migrateCreate];

const migrateCommand: Command = {
  name: "migrate",
  description: "Database migration commands",
  subcommands: commands,
  handler: async (ctx) => {
    ctx.logger.info("Available migrate subcommands: up, status, list, create");
    return { exitCode: 0 };
  },
};

export default migrateCommand;
export { migrateUp, migrateStatus, migrateList, migrateCreate };
