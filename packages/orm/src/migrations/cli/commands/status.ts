/**
 * Status Command
 *
 * Show migration status for all modules.
 */

import { MikroORM } from "@damatjs/deps/mikro-orm/postgresql";
import type { CliOptions } from "../../../types";
import { getMigrationStatus, getModuleMigrationStatus } from "../../executor";
import type { CommandResult } from "./types";

/**
 * Show migration status.
 */
export async function commandStatus(
  options: CliOptions,
  args: string[],
): Promise<CommandResult> {
  const { ormConfig, modulesDir, activeModules } = options;

  const [moduleName] = args;

  if (moduleName) {
    console.log("");
    console.log(`Checking migration status for module '${moduleName}'...`);
    console.log("");
  } else {
    console.log("");
    console.log("Checking migration status...");
    console.log("");
  }

  const orm = await MikroORM.init(ormConfig);

  let noMigration = true;
  if (moduleName) {

    const status = await getModuleMigrationStatus(orm, modulesDir, moduleName);
    const mod = status.module
    const statusIcon =
      mod.pending > 0 ? "\x1b[33m○\x1b[0m" : "\x1b[32m✓\x1b[0m";
    console.log(
      `${statusIcon} ${mod.name}: ${mod.applied} applied, ${mod.pending} pending`,
    );

    for (const m of mod.migrations) {
      const icon = m.applied ? "\x1b[32m✓\x1b[0m" : "\x1b[33m○\x1b[0m";
      console.log(`  ${icon} ${m.name}`);
    }

    if (mod.migrations.length === 0) {
      noMigration = false
    }
  } else {

    const status = await getMigrationStatus(orm, modulesDir, activeModules);

    for (const mod of status.modules) {
      const statusIcon =
        mod.pending > 0 ? "\x1b[33m○\x1b[0m" : "\x1b[32m✓\x1b[0m";
      console.log(
        `${statusIcon} ${mod.name}: ${mod.applied} applied, ${mod.pending} pending`,
      );

      for (const m of mod.migrations) {
        const icon = m.applied ? "\x1b[32m✓\x1b[0m" : "\x1b[33m○\x1b[0m";
        console.log(`  ${icon} ${m.name}`);
      }
    }

    if (status.modules.length === 0)
      noMigration = false
  }

  if (noMigration) {
    console.log("\x1b[90mNo modules with migrations found.\x1b[0m");
  }

  console.log("");

  return { exitCode: 0, orm };
}
