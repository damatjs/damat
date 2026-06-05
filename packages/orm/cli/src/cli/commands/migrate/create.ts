import type { Command } from "@damatjs/cli";
import { loadModules } from "@/cli/utils/load";

const migrateCreate: Command = {
  name: "migrate:create",
  description: "Create a new migration for a module",
  handler: async (ctx) => {
    const { createInitialMigration, createDiffMigration } =
      await import("@damatjs/orm-migration");
    const { snapshotExist } = await import("@damatjs/orm-processor");
    const { resolveMigrationsPath } = await import("@/cli/utils");

    const moduleName = ctx.args[0];

    if (!moduleName) {
      ctx.logger.error("Module name is required");
      return { exitCode: 1 };
    }

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

    const moduleConfig = modules[moduleName];
    if (!moduleConfig) {
      ctx.logger.error(`Module '${moduleName}' not found in config`);
      return { exitCode: 1 };
    }

    const resolvedMigrationsDir = resolveMigrationsPath(moduleConfig.resolve);

    try {
      const isInitial = !snapshotExist(resolvedMigrationsDir);

      if (isInitial) {
        ctx.logger.info(
          `Creating initial migration for module '${moduleName}'...`,
        );
        const filePath = await createInitialMigration(
          moduleName,
          moduleConfig.resolve,
        );
        ctx.logger.success("Migration created");
        console.log(`  File: ${filePath}`);
      } else {
        ctx.logger.info(
          `Creating diff migration for module '${moduleName}'...`,
        );
        const result = await createDiffMigration(
          moduleName,
          moduleConfig.resolve,
        );

        if (!result.hasChanges) {
          ctx.logger.skip("No changes detected.");
          return { exitCode: 0 };
        }

        ctx.logger.success("Migration created");
        console.log(`  File: ${result.filePath}`);
        if (result.warnings) {
          for (const w of result.warnings) {
            ctx.logger.warn(w);
          }
        }
      }

      return { exitCode: 0 };
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
      return { exitCode: 1 };
    }
  },
};

export default migrateCreate;
