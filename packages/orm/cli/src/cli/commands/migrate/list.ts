import type { Command } from "@damatjs/cli";
import { loadModules } from "@/cli/utils/load";

const migrateList: Command = {
  name: "migrate:list",
  description: "List all modules with migrations",
  handler: async (ctx) => {
    const { discoverAllMigrations } = await import("@damatjs/orm-migration");

    // Load modules from damat.config.ts
    let modules: Record<string, { resolve: string }>;
    try {
      modules = await loadModules("damat.config.ts", ctx.cwd);
    } catch (error) {
      ctx.logger.error(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exitCode: 1 };
    }

    if (!modules || Object.keys(modules).length === 0) {
      ctx.logger.error("No modules found in 'damat.config.ts'");
      return { exitCode: 1 };
    }

    ctx.logger.info("Modules with migrations:");

    const allMigrations = discoverAllMigrations(
      Object.values(modules).map((m) => m.resolve),
    );
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
