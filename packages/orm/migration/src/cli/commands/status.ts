/**
 * Status Command
 *
 * Show migration status for all modules.
 */

import { Pool } from "@damatjs/deps/pg";
import type { CliOptions } from "../../types";
import { getMigrationStatus, getModuleMigrationStatus } from "../../executor";
import { log } from "../../logger";
import { DEFAULT_MODULES_DIR } from "../../generator";
import type { CommandResult } from "./types";

/**
 * Show migration status.
 */
export async function commandStatus(
  options: CliOptions,
  args: string[],
): Promise<CommandResult> {
  const { database, activeModules } = options;
  const modulesDir = options.modulesDir ?? DEFAULT_MODULES_DIR;
  const [moduleName] = args;

  console.log("");
  if (moduleName) {
    log("info", `Checking migration status for module '${moduleName}'...`);
  } else {
    log("info", "Checking migration status...");
  }
  console.log("");

  const pool = new Pool({
    connectionString: database.url,
    min: database.poolMin,
    max: database.poolMax,
  });

  let hasModules = false;

  if (moduleName) {
    const status = await getModuleMigrationStatus(pool, modulesDir, moduleName);
    const mod = status.module;

    hasModules = true;
    log(
      mod.pending > 0 ? "warn" : "success",
      `${mod.name}: ${mod.applied} applied, ${mod.pending} pending`,
    );

    for (const m of mod.migrations) {
      log(m.applied ? "success" : "warn", `  ${m.name}`);
    }
  } else {
    const status = await getMigrationStatus(pool, modulesDir, activeModules);

    hasModules = status.modules.length > 0;

    for (const mod of status.modules) {
      log(
        mod.pending > 0 ? "warn" : "success",
        `${mod.name}: ${mod.applied} applied, ${mod.pending} pending`,
      );

      for (const m of mod.migrations) {
        log(m.applied ? "success" : "warn", `  ${m.name}`);
      }
    }
  }

  if (!hasModules) {
    log("skip", "No modules with migrations found.");
  }

  console.log("");

  return { exitCode: 0, pool };
}
