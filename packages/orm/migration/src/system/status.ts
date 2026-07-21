import type { SystemMigration } from "@damatjs/durability";
import type { ModuleMigrationStatus } from "../types";
import type { MigrationTracker } from "../tracker";

export async function getSystemMigrationStatus(
  tracker: MigrationTracker,
  migrations: readonly SystemMigration[],
): Promise<ModuleMigrationStatus[]> {
  const owners = [...new Set(migrations.map((item) => item.owner))];
  const statuses: ModuleMigrationStatus[] = [];
  for (const owner of owners) {
    const ownerMigrations = migrations
      .filter((item) => item.owner === owner)
      .sort((a, b) => a.order - b.order);
    const applied = new Set(
      (await tracker.getApplied(owner)).map((item) => item.name),
    );
    const items = ownerMigrations.map((migration) => ({
      name: migration.id,
      resolver: migration.owner,
      path: `inline:${migration.owner}:${migration.id}`,
      timestamp: migration.order,
      applied: applied.has(migration.id),
    }));
    statuses.push({
      name: owner,
      applied: items.filter((item) => item.applied).length,
      pending: items.filter((item) => !item.applied).length,
      migrations: items,
    });
  }
  return statuses;
}
