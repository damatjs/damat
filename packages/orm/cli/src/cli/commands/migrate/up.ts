import { type Command, reportError } from "@damatjs/cli";
import { loadModules, loadDatabaseUrl } from "@/cli/utils/load";
import { OrmModuleContainer } from "@/cli/types";

const migrateUp: Command = {
  name: "migrate:up",
  description: "Run all pending migrations",
  handler: async (ctx) => {
    const { Pool } = await import("@damatjs/deps/pg");
    const { runMigrations } = await import("@damatjs/orm-migration");

    // Load modules from damat.config.ts
    let modules: OrmModuleContainer;
    try {
      modules = await loadModules("damat.config.ts", ctx.cwd);
    } catch (error) {
      reportError(ctx.logger, error, { prefix: "Failed to load config" });
      return { exitCode: 1 };
    }

    if (!modules || Object.keys(modules).length === 0) {
      ctx.logger.error("No modules found in 'damat.config.ts'");
      return { exitCode: 1 };
    }

    // Load database URL from damat.config.ts
    let databaseUrl: string;
    try {
      const config = await loadDatabaseUrl("damat.config.ts", ctx.cwd);
      databaseUrl = config.databaseUrl;
    } catch (error) {
      reportError(ctx.logger, error, { prefix: "Failed to load database config" });
      return { exitCode: 1 };
    }

    if (!databaseUrl) {
      ctx.logger.error("No databaseUrl found in 'damat.config.ts'");
      return { exitCode: 1 };
    }

    ctx.logger.info("Running module migrations...");

    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const results = await runMigrations(pool, modules);
      // results are returned in the same order as Object.values(modules), so we
      // can recover which module each failure belongs to and surface its error.
      const moduleList = Object.values(modules);
      const failures = results.filter((r) => !r.success);

      if (failures.length > 0) {
        results.forEach((result, index) => {
          if (result.success) return;
          const moduleName = moduleList[index]?.name ?? "unknown";
          reportError(
            ctx.logger,
            result.error ?? new Error("Migration failed"),
            { prefix: `Migration failed for "${moduleName}"` },
          );
        });
      } else {
        ctx.logger.success("Migration completed successfully");
      }

      return { exitCode: failures.length > 0 ? 1 : 0 };
    } finally {
      await pool.end();
    }
  },
};

export default migrateUp;
