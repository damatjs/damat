/**
 * Create Command
 *
 * Create a new migration file by comparing current entities against the schema snapshot.
 * Automatically detects if this is an initial migration (no snapshot) or a diff migration.
 */

import fs from "node:fs";
import path from "node:path";
import { MikroORM } from "@damatjs/deps/mikro-orm/postgresql";

import type { CliOptions } from "../../../types";
// import { createDiffMigration, createInitialMigration } from "../../generator";
import { getSnapshotPath } from "../../generator/snapshot";
import { listModulesWithMigrations } from "../../discovery";
import type { CommandResult } from "./types";

/**
 * Create a new migration by comparing entities against the schema snapshot.
 *
 * - If no snapshot exists: creates an initial migration with all tables
 * - If snapshot exists: creates a diff migration with only the changes
 */
export async function commandCreate(
  options: CliOptions,
  args: string[],
): Promise<CommandResult> {
  const { ormConfig, modulesDir, activeModules, modules } = options;
  const [moduleName, migrationName] = args;

  // Validate required arguments
  if (!moduleName || !migrationName) {
    printUsage(modulesDir, activeModules);
    return { exitCode: 1 };
  }

  // Validate modules are configured
  if (!modules || modules.length === 0) {
    console.error(
      "\x1b[31mError: No modules configured. Add 'modules' to CLI options.\x1b[0m",
    );
    console.error("");
    console.error("Example:");
    console.error("  runCli({");
    console.error("    ormConfig,");
    console.error("    modulesDir: './src/modules',");
    console.error("    activeModules: ['user'],");
    console.error(
      "    modules: [{ name: 'user', entities: [User, Profile] }],",
    );
    console.error("  });");
    return { exitCode: 1 };
  }

  // Find the module
  const dbModule = modules.find((m) => m.name === moduleName);
  if (!dbModule) {
    console.error(
      `\x1b[31mError: Module '${moduleName}' not found in configured modules.\x1b[0m`,
    );
    console.error("");
    console.error("Available modules:");
    for (const m of modules) {
      console.error(`  - ${m.name}`);
    }
    return { exitCode: 1 };
  }

  // Validate module has entities
  if (!dbModule.entities || dbModule.entities.length === 0) {
    console.error(
      `\x1b[31mError: Module '${moduleName}' has no entities defined.\x1b[0m`,
    );
    return { exitCode: 1 };
  }

  // Check if module directory exists
  const moduleDir = path.join(modulesDir, moduleName);
  if (!fs.existsSync(moduleDir)) {
    console.error(
      `\x1b[31mError: Module directory not found at ${moduleDir}\x1b[0m`,
    );
    return { exitCode: 1 };
  }

  let orm: MikroORM | undefined;

  try {
    // Initialize ORM
    orm = await MikroORM.init(ormConfig);

    // Check if this is an initial migration (no snapshot exists)
    const migrationsDir = path.join(moduleDir, "migrations");
    const snapshotPath = getSnapshotPath(migrationsDir);
    const isInitial = !fs.existsSync(snapshotPath);

    if (isInitial) {
      // Create initial migration
      console.log("");
      console.log(
        `Creating initial migration for module '\x1b[36m${moduleName}\x1b[0m'...`,
      );
      console.log("");

      // const filePath = createInitialMigration(
      //   modulesDir,
      //   moduleName,
      //   dbModule.entities,
      //   orm,
      // );

      console.log("");
      console.log("Next steps:");
      // console.log(`  1. Review the migration file: ${filePath}`);
      console.log("  2. Run migrations: npm run db:migrate");
      console.log("");
    } else {
      // Create diff migration
      console.log("");
      console.log(
        `Creating diff migration for module '\x1b[36m${moduleName}\x1b[0m'...`,
      );
      console.log("");

      // const result = createDiffMigration(
      //   modulesDir,
      //   moduleName,
      //   migrationName,
      //   dbModule.entities,
      //   orm,
      // );

      // if (!result.hasChanges) {
      //   console.log("\x1b[33mNo changes detected.\x1b[0m");
      //   console.log(
      //     "The current entities match the schema snapshot. No migration created.",
      //   );
      //   console.log("");
      //   return buildResult(0, orm);
      // }

      // console.log("");
      // console.log("Next steps:");
      // console.log(`  1. Review the migration file: ${result.filePath}`);
      // console.log("  2. Run migrations: npm run db:migrate");
      // console.log("");

      // // Show warnings if any
      // if (result.warnings.length > 0) {
      //   console.log("\x1b[33mWarnings:\x1b[0m");
      //   for (const warning of result.warnings) {
      //     console.log(`  - ${warning}`);
      //   }
      //   console.log("");
      // }
    }

    return buildResult(0, orm);
  } catch (error) {
    console.error(
      "\x1b[31mError:\x1b[0m",
      error instanceof Error ? error.message : error,
    );
    return buildResult(1, orm);
  }
}

/**
 * Build command result with optional ORM
 */
function buildResult(exitCode: number, orm?: MikroORM): CommandResult {
  if (orm) {
    return { exitCode, orm };
  }
  return { exitCode };
}

/**
 * Print usage information
 */
function printUsage(modulesDir: string, activeModules: string[]): void {
  console.error(
    "\x1b[31mError: Module name and migration name are required\x1b[0m",
  );
  console.error("");
  console.error("Usage: npm run db:migrate:create <module> <name>");
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
    "  npm run db:migrate:create user Initial       # First migration",
  );
  console.error(
    "  npm run db:migrate:create user AddPhoneColumn # Add changes",
  );
  console.error("");
  console.error(
    "The command automatically detects if this is an initial or diff migration.",
  );
}
