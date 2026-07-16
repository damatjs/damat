import type { SystemMigration, SystemMigrationCatalog } from "./types";
import { shared001 } from "./shared-001";
import { shared002 } from "./shared-002";

export const durabilitySystemMigrations: SystemMigrationCatalog = {
  owner: "@damatjs/durability",
  migrations: [shared001, shared002],
};

export function collectSystemMigrations(
  catalogs: readonly SystemMigrationCatalog[],
): SystemMigration[] {
  const seen = new Set<string>();
  const migrations = catalogs.flatMap((catalog) =>
    catalog.migrations.map((migration) => {
      if (migration.owner !== catalog.owner) {
        throw new Error(
          `System migration ${migration.id} owner does not match its catalog`,
        );
      }
      const key = `${migration.owner}:${migration.id}`;
      if (seen.has(key)) throw new Error(`Duplicate system migration: ${key}`);
      seen.add(key);
      return migration;
    }),
  );
  return migrations.sort(
    (left, right) =>
      left.order - right.order ||
      left.owner.localeCompare(right.owner) ||
      left.id.localeCompare(right.id),
  );
}
