/**
 * Up Command
 *
 * Run all pending migrations.
 */

import { Pool } from "@damatjs/deps/pg";
import type { CliOptions } from "../../types";
import { runMigrations } from "../../executor";
import { log, successBanner, errorBanner } from "../../logger";
import { DEFAULT_MODULES_DIR } from "../../generator";
import type { CommandResult } from "./types";

/**
 * Run all pending migrations (up command).
 */
export async function commandUp(options: CliOptions): Promise<CommandResult> {
  const { database, modules } = options;
  const modulesDir = options.modulesDir ?? DEFAULT_MODULES_DIR;

  console.log("");
  log("info", "Running module migrations...");
  console.log("");

  const pool = new Pool({
    connectionString: database.url,
    min: database.poolMin,
    max: database.poolMax,
  });
  const results = await runMigrations(pool, modulesDir, modules);

  const hasFailures = results.some((r) => !r.success);
  console.log("");

  if (hasFailures) {
    errorBanner("Migration failed");
  } else {
    successBanner("Migration completed successfully");
  }

  return { exitCode: hasFailures ? 1 : 0, pool };
}
