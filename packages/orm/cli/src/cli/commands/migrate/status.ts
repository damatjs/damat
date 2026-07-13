import { type Command, reportError } from "@damatjs/cli";
import { loadDatabaseUrl, loadModules } from "@/cli/utils/load";
import { OrmModuleContainer } from "@/cli/types";

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
    const { getMigrationStatus, getModuleMigrationStatus } =
      await import("@damatjs/orm-migration");

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

    const moduleName = (ctx.options.module as string) || ctx.args[0];

    // Load database URL from damat.config.ts
    let databaseUrl: string;
    try {
      const config = await loadDatabaseUrl("damat.config.ts", ctx.cwd);
      databaseUrl = config.databaseUrl;
    } catch (error) {
      reportError(ctx.logger, error, {
        prefix: "Failed to load database config",
      });
      return { exitCode: 1 };
    }

    if (!databaseUrl) {
      ctx.logger.error("No databaseUrl found in 'damat.config.ts'");
      return { exitCode: 1 };
    }

    ctx.logger.info("Checking migration status...");

    const pool = new Pool({ connectionString: databaseUrl });
    try {
      if (moduleName) {
        const moduleConfig = modules[moduleName];
        if (!moduleConfig) {
          ctx.logger.error(`Module '${moduleName}' not found in config`);
          return { exitCode: 1 };
        }
        // Pass the full module descriptor: migrations are discovered via
        // `resolve`, but the tracker table is keyed by module name.
        const status = await getModuleMigrationStatus(pool, moduleConfig);
        ctx.logger[status.module.pending > 0 ? "info" : "success"](
          `${status.module.name}: ${status.module.applied} applied, ${status.module.pending} pending`,
        );
        for (const m of status.module.migrations) {
          ctx.logger[m.applied ? "success" : "info"](`${m.name}`);
        }
      } else {
        const status = await getMigrationStatus(pool, modules);
        for (const mod of status.modules) {
          ctx.logger[mod.pending > 0 ? "info" : "success"](
            `${mod.name}: ${mod.applied} applied, ${mod.pending} pending`,
          );
          for (const m of mod.migrations) {
            ctx.logger[m.applied ? "success" : "info"](`${m.name}`);
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
