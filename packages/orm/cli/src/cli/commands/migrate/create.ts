import fs from "node:fs";
import type { Command, CommandContext, CommandResult } from "../../types";
import { createInitialMigration, createDiffMigration } from "@damatjs/orm-migration";
import { snapshotExist } from "@damatjs/orm-model";
import { resolveMigrationsPath, resolveModelsPath } from "../../utils/paths";

const migrateCreate: Command = {
  name: "migrate:create",
  description: "Create a new migration for a module",
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const [moduleName] = ctx.args;
    const { config, migrationsDir, modelsDir } = ctx.options;

    if (!moduleName) {
      ctx.logger.error("Module name is required");
      console.log("");
      console.log("Usage: damat-orm migrate:create <module>");
      return { exitCode: 1 };
    }

    const resolvedModelsDir = resolveModelsPath({ cliModelsDir: modelsDir }, config ?? {}, moduleName);
    const resolvedMigrationsDir = resolveMigrationsPath(
      { cliMigrationsDir: migrationsDir },
      config ?? {},
      moduleName
    );

    if (!fs.existsSync(resolvedModelsDir)) {
      ctx.logger.error(`Models directory not found: ${resolvedModelsDir}`);
      return { exitCode: 1 };
    }

    try {
      const isInitial = !snapshotExist(resolvedMigrationsDir);

      if (isInitial) {
        console.log("");
        ctx.logger.info(`Creating initial migration for module '${moduleName}'...`);
        console.log("");
        const filePath = await createInitialMigration(moduleName, resolvedModelsDir);
        printSuccess(ctx, filePath);
      } else {
        console.log("");
        ctx.logger.info(`Creating diff migration for module '${moduleName}'...`);
        console.log("");
        const result = await createDiffMigration(moduleName, resolvedModelsDir);

        if (!result.hasChanges) {
          ctx.logger.skip("No changes detected.");
          console.log("The current models match the schema snapshot. No migration created.");
          console.log("");
          return { exitCode: 0 };
        }

        printSuccess(ctx, result.filePath ?? "unknown", result.warnings);
      }

      return { exitCode: 0 };
    } catch (error) {
      ctx.logger.error(error instanceof Error ? error.message : String(error));
      return { exitCode: 1 };
    }
  },
};

function printSuccess(ctx: CommandContext, filePath: string, warnings: string[] = []): void {
  ctx.logger.success("Migration created");
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Review the migration file: ${filePath}`);
  console.log("  2. Run migrations: damat-orm migrate:up");
  console.log("");

  if (warnings.length > 0) {
    for (const warning of warnings) {
      ctx.logger.warn(warning);
    }
    console.log("");
  }
}

export default migrateCreate;
