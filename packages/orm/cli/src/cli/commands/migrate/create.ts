import type { Command } from "@damatjs/cli";

const migrateCreate: Command = {
  name: "migrate:create",
  description: "Create a new migration for a module",
  handler: async (ctx) => {
    const fs = await import("node:fs");
    const { createInitialMigration, createDiffMigration } = await import("@damatjs/orm-migration");
    const { snapshotExist } = await import("@damatjs/orm-processor");
    const { resolveMigrationsPath, resolveModelsPath } = await import("../../utils/paths/index.js");

    const moduleName = ctx.args[0];
    const config = ctx.options.config as Record<string, { resolve: string }> | undefined;

    if (!moduleName) {
      ctx.logger.error("Module name is required");
      return { exitCode: 1 };
    }
    if (!config || Object.keys(config).length === 0) {
      ctx.logger.error("Config is required. Make sure damat.config.ts exists.");
      return { exitCode: 1 };
    }

    const module = config[moduleName];
    if (!module) {
      ctx.logger.error(`Module '${moduleName}' not found in config`);
      return { exitCode: 1 };
    }

    const resolvedModelsDir = resolveModelsPath(config, module.resolve);
    if (!fs.existsSync(resolvedModelsDir)) {
      ctx.logger.error(`Models directory not found: ${resolvedModelsDir}`);
      return { exitCode: 1 };
    }

    const resolvedMigrationsDir = resolveMigrationsPath(module.resolve);

    try {
      const isInitial = !snapshotExist(resolvedMigrationsDir);

      if (isInitial) {
        ctx.logger.info(`Creating initial migration for module '${moduleName}'...`);
        const filePath = await createInitialMigration(moduleName, resolvedModelsDir);
        ctx.logger.success("Migration created");
        console.log(`  File: ${filePath}`);
      } else {
        ctx.logger.info(`Creating diff migration for module '${moduleName}'...`);
        const result = await createDiffMigration(moduleName, resolvedModelsDir);

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
