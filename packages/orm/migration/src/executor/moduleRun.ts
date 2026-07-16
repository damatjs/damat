import type { Pool } from "@damatjs/deps/pg";
import type { OrmModule } from "@damatjs/orm-type";
import type { ModuleMigrationResult } from "../types";
import { discoverModuleMigrations } from "../discovery";
import { log } from "../logger";
import type { MigrationTracker } from "../tracker";
import { executeMigration } from "./migration";

export async function runModuleMigrations(
  pool: Pool,
  module: OrmModule,
  tracker: MigrationTracker,
): Promise<ModuleMigrationResult> {
  const result: ModuleMigrationResult = {
    success: true,
    applied: [],
    pending: [],
  };
  try {
    const migrations = discoverModuleMigrations(module);
    const applied = await tracker.getApplied(module.name);
    const appliedNames = new Set(applied.map((item) => item.name));
    const pending = migrations.filter((item) => !appliedNames.has(item.name));
    result.pending = pending.map((item) => item.name);
    if (!pending.length) {
      log("skip", `${module.name}: No pending migrations`);
      return result;
    }
    log("info", `${module.name}: Running ${pending.length} migration(s)...`);
    for (const migration of pending) {
      const outcome = await executeMigration(
        pool,
        migration,
        module.name,
        tracker,
      );
      if (outcome.success) result.applied.push(migration.name);
      else {
        result.success = false;
        if (outcome.error) result.error = outcome.error;
        break;
      }
    }
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error : new Error(String(error));
    log("error", `${module.name}: Migration failed`, result.error.message);
  }
  return result;
}
