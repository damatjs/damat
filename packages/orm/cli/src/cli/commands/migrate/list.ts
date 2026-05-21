import type { Command, CommandContext, CommandResult } from "../../types";
import { discoverAllMigrations } from "@damatjs/orm-migration";

const migrateList: Command = {
  name: "migrate:list",
  description: "List all modules with migrations",
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const { config } = ctx.options;

    console.log("");
    ctx.logger.info("Modules with migrations:");
    console.log("");

    const allMigrations = discoverAllMigrations(Object.values(config ?? {}).map(m => m.resolve));
    const moduleMap = new Map<string, number>();

    for (const m of allMigrations) {
      moduleMap.set(m.name, (moduleMap.get(m.name) ?? 0) + 1);
    }

    if (moduleMap.size === 0) {
      ctx.logger.skip("No modules with migrations found.");
    } else {
      for (const [mod, count] of [...moduleMap.entries()].sort()) {
        console.log(`  - ${mod} (${count} migration${count > 1 ? "s" : ""})`);
      }
    }

    console.log("");
    return { exitCode: 0 };
  },
};

export default migrateList;
