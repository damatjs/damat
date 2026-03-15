/**
 * Create Command
 *
 * Create a new migration file by auto-discovering model definitions from
 * {modulesDir}/{module}/models/ and comparing against the schema snapshot.
 * Automatically detects if this is an initial migration (no snapshot) or a diff migration.
 */

import fs from "node:fs";
import path from "node:path";

import type { CliOptions } from "../../types";
import {
  createInitialMigration,
  createDiffMigration,
  DEFAULT_MODULES_DIR,
} from "../../generator";
import { listModulesWithMigrations } from "../../discovery";
import { log } from "../../logger";
import { snapshotExist } from "../../snapshot";
import type { CommandResult } from "./types";

/**
 * Create a new migration by comparing model definitions against the schema snapshot.
 *
 * - No snapshot → initial migration (full CREATE TABLE SQL)
 * - Snapshot exists → diff migration (only the changes)
 */
export async function commandCreate(
  options: CliOptions,
  args: string[],
): Promise<CommandResult> {
  const { activeModules } = options;
  const modulesDir = options.modulesDir ?? DEFAULT_MODULES_DIR;
  const [moduleName] = args;

  if (!moduleName) {
    printUsage(modulesDir, activeModules);
    return { exitCode: 1 };
  }

  // Check if module directory exists
  const moduleDir = path.join(modulesDir, moduleName);
  if (!fs.existsSync(moduleDir)) {
    log("error", `Module directory not found at ${moduleDir}`);
    return { exitCode: 1 };
  }

  try {
    const migrationsDir = path.join(moduleDir, "migrations");
    const isInitial = !snapshotExist(migrationsDir);

    if (isInitial) {
      console.log("");
      log("info", `Creating initial migration for module '${moduleName}'...`);
      console.log("");

      const filePath = await createInitialMigration(moduleName, modulesDir);

      console.log("");
      console.log("Next steps:");
      console.log(`  1. Review the migration file: ${filePath}`);
      console.log("  2. Run migrations: npm run db:migrate");
      console.log("");
    } else {
      console.log("");
      log("info", `Creating diff migration for module '${moduleName}'...`);
      console.log("");

      const result = await createDiffMigration(moduleName, modulesDir);

      if (!result.hasChanges) {
        log("skip", "No changes detected.");
        console.log(
          "The current models match the schema snapshot. No migration created.",
        );
        console.log("");
        return { exitCode: 0 };
      }

      console.log("");
      console.log("Next steps:");
      console.log(`  1. Review the migration file: ${result.filePath}`);
      console.log("  2. Run migrations: npm run db:migrate");
      console.log("");

      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          log("warn", warning);
        }
        console.log("");
      }
    }

    return { exitCode: 0 };
  } catch (error) {
    log("error", error instanceof Error ? error.message : String(error));
    return { exitCode: 1 };
  }
}

/**
 * Print usage information
 */
function printUsage(modulesDir: string, activeModules: string[]): void {
  log("error", "Module name is required");
  console.error("");
  console.error("Usage: npm run db:migrate:create <module>");
  console.error("");
  console.error("Modules with migrations:");

  const foundModules = listModulesWithMigrations(modulesDir, activeModules);
  if (foundModules.length > 0) {
    for (const m of foundModules) {
      console.error(`  - ${m}`);
    }
  } else {
    console.error("  (no modules found)");
  }

  console.error("");
  console.error("Examples:");
  console.error(
    "  npm run db:migrate:create user    # First or diff migration",
  );
  console.error("");
  console.error(
    "Models are auto-discovered from {modulesDir}/{module}/models/",
  );
}
