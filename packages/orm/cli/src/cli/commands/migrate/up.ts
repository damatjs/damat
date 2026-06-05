import type { Command } from "@damatjs/cli";
import { loadModules } from "@/cli/utils/load";

const migrateUp: Command = {
  name: "migrate:up",
  description: "Run all pending migrations",
  handler: async (ctx) => {
    const { Pool } = await import("@damatjs/deps/pg");
    const { runMigrations } = await import("@damatjs/orm-migration");
    const { requireDatabaseUrl } = await import("../../config/index.js");

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

    ctx.logger.info("Running module migrations...");

    const pool = new Pool({ connectionString: requireDatabaseUrl(ctx.logger) });
    try {
      const results = await runMigrations(
        pool,
        Object.values(modules).map((m) => m.resolve),
      );
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
