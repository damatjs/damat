import type { MigrationInfo } from "../types";
import type { OrmModule } from "@damatjs/orm-type";
import { discoverModuleMigrations } from "./moduleMigrations";

type MigrationSource = string | Pick<OrmModule, "resolve" | "migrations">;

/**
 * Discover and collect migrations from the provided module resolvers,
 * then return them sorted by timestamp (oldest first).
 *
 * @param modulesResolver - Array of module resolver paths or identifiers
 *                          used to discover module migrations
 * @returns All migration info objects sorted oldest-first
 *
 * @example
 * ```typescript
 * discoverAllMigrations([
 *   'src/modules/user',
 *   'src/modules/billing'
 * ]);
 *
 * // returns migrations from both modules,
 * // sorted by timestamp ascending
 * ```
 */
export function discoverAllMigrations(
  modulesResolver: MigrationSource[],
): MigrationInfo[] {
  const migrations: MigrationInfo[] = [];

  for (const moduleResolver of modulesResolver) {
    migrations.push(...discoverModuleMigrations(moduleResolver));
  }

  return migrations.sort((a, b) => a.timestamp - b.timestamp);
}
