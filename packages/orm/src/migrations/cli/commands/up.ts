/**
 * Up Command
 *
 * Run all pending migrations.
 */

import { MikroORM } from "@damatjs/deps/mikro-orm/postgresql";
import type { CliOptions } from "../../../types";
import { runMigrations } from "../../executor";
import { successBanner, errorBanner } from "../../logger";
import type { CommandResult } from "./types";

/**
 * Run all pending migrations (up command).
 */
export async function commandUp(options: CliOptions): Promise<CommandResult> {
  const { ormConfig, modulesDir, activeModules } = options;

  console.log("");
  console.log("Running module migrations...");
  console.log("");

  const orm = await MikroORM.init(ormConfig);
  const results = await runMigrations(orm, modulesDir, activeModules);

  const hasFailures = results.some((r) => !r.success);
  console.log("");

  if (hasFailures) {
    errorBanner("Migration failed");
  } else {
    successBanner("Migration completed successfully");
  }

  return { exitCode: hasFailures ? 1 : 0, orm };
}
