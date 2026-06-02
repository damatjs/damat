import type { Command } from "@damatjs/cli";

const migrateUp: Command = {
  name: "migrate:up",
  description: "Run all pending migrations",
  handler: async (ctx) => {
    const { Pool } = await import("@damatjs/deps/pg");
    const { runMigrations } = await import("@damatjs/orm-migration");
    const { requireDatabaseUrl } = await import("../../config/index.js");

    const config = ctx.options.config as Record<string, { resolve: string }> | undefined;
    if (!config || Object.keys(config).length === 0) {
      ctx.logger.error("Config is required. Make sure damat.config.ts exists.");
      return { exitCode: 1 };
    }

    ctx.logger.info("Running module migrations...");

    const pool = new Pool({ connectionString: requireDatabaseUrl(ctx.logger) });
    try {
      const results = await runMigrations(pool, Object.values(config).map((m) => m.resolve));
      const hasFailures = results.some((r) => !r.success);

      if (hasFailures) {
        ctx.logger.error("Migration failed");
      } else {
        ctx.logger.success("Migration completed successfully");
      }

      return { exitCode: hasFailures ? 1 : 0 };
    } finally {
      await pool.end();
    }
  },
};

export default migrateUp;
