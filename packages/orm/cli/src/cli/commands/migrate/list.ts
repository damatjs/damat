import type { Command } from "@damatjs/cli";

const migrateList: Command = {
  name: "migrate:list",
  description: "List all modules with migrations",
  handler: async (ctx) => {
    const { discoverAllMigrations } = await import("@damatjs/orm-migration");

    const config = ctx.options.config as Record<string, { resolve: string }> | undefined;

    ctx.logger.info("Modules with migrations:");

    const allMigrations = discoverAllMigrations(Object.values(config ?? {}).map((m) => m.resolve));
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

    return { exitCode: 0 };
  },
};

export default migrateList;
