import {
  assertSystemMigrationsApplied,
  collectSystemMigrations,
  createDurabilityClient,
  DurableInfrastructureNotMigratedError,
  durabilitySystemMigrations,
  setDurabilityClient,
  type SystemMigrationCatalog,
} from "@damatjs/durability";
import { eventsSystemMigrations } from "@damatjs/events/migrations";
import { jobsSystemMigrations } from "@damatjs/jobs/migrations";
import { PoolManager } from "@damatjs/services";
import type { AppConfig } from "../../config";
import { configureWorkerWakeupPublishers } from "./wakeup";

function enabledCatalogs(config: AppConfig): SystemMigrationCatalog[] {
  return [
    durabilitySystemMigrations,
    ...(config.services?.jobs ? [jobsSystemMigrations] : []),
    ...(config.services?.events?.durable ? [eventsSystemMigrations] : []),
  ];
}

function usesDurability(config: AppConfig): boolean {
  return Boolean(config.services?.jobs || config.services?.events?.durable);
}

export async function initializeDurability(config: AppConfig): Promise<void> {
  if (!usesDurability(config)) return;
  if (!config.projectConfig.databaseUrl) {
    throw new Error(
      "Configure projectConfig.databaseUrl, then run: damat-orm migrate:up",
    );
  }
  const client = createDurabilityClient({ pool: PoolManager.getPool() });
  try {
    await assertSystemMigrationsApplied(
      client,
      collectSystemMigrations(enabledCatalogs(config)),
    );
  } catch (error) {
    if (!(error instanceof DurableInfrastructureNotMigratedError)) throw error;
    throw new Error(
      "Durable infrastructure is not migrated. Run: damat-orm migrate:up",
      { cause: error },
    );
  }
  setDurabilityClient(client);
  configureWorkerWakeupPublishers(config);
}
