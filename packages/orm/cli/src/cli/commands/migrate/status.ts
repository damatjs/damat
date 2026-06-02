import type { Command } from "@damatjs/cli";

const migrateStatus: Command = {
  name: "migrate:status",
  description: "Show migration status",
  options: [
    {
      name: "module",
      alias: "m",
      type: "string",
      description: "Module name to check status for",
    },
  ],
  handler: async (ctx) => {
    const { Pool } = await import("@damatjs/deps/pg");
    const { getMigrationStatus, getModuleMigrationStatus } = await import("@damatjs/orm-migration");
    const { requireDatabaseUrl } = await import("../../config/index.js");

    const config = ctx.options.config as Record<string, { resolve: string }> | undefined;
    const moduleName = (ctx.options.module as string) || ctx.args[0];

    if (!config || Object.keys(config).length === 0) {
      ctx.logger.error("Config is required. Make sure damat.config.ts exists.");
      return { exitCode: 1 };
    }

    ctx.logger.info("Checking migration status...");

    const pool = new Pool({ connectionString: requireDatabaseUrl(ctx.logger) });
    try {
      if (moduleName) {
        const module = config[moduleName];
        if (!module) {
          ctx.logger.error(`Module '${moduleName}' not found in config`);
          return { exitCode: 1 };
        }
        const status = await getModuleMigrationStatus(pool, module.resolve);
        ctx.logger[status.module.pending > 0 ? "warn" : "success"](
          `${status.module.name}: ${status.module.applied} applied, ${status.module.pending} pending`
        );
        for (const m of status.module.migrations) {
          ctx.logger[m.applied ? "success" : "warn"](`  ${m.name}`);
        }
      } else {
        const status = await getMigrationStatus(pool, Object.values(config).map((m) => m.resolve));
        for (const mod of status.modules) {
          ctx.logger[mod.pending > 0 ? "warn" : "success"](
            `${mod.name}: ${mod.applied} applied, ${mod.pending} pending`
          );
          for (const m of mod.migrations) {
            ctx.logger[m.applied ? "success" : "warn"](`  ${m.name}`);
          }
        }
      }
      return { exitCode: 0 };
    } finally {
      await pool.end();
    }
  },
};

export default migrateStatus;
