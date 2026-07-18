import {
  assertSystemMigrationsApplied,
  collectSystemMigrations,
  clearDurabilityClient,
  createDurabilityClient,
  ProcessDurabilityCoordinator,
  DurableInfrastructureNotMigratedError,
  durabilitySystemMigrations,
  setDurabilityClient,
  type SystemMigrationCatalog,
  type DurabilityCoordinator,
} from "@damatjs/durability";
import { eventsSystemMigrations } from "@damatjs/events/migrations";
import { jobsSystemMigrations } from "@damatjs/jobs/migrations";
import { PoolManager } from "@damatjs/services";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";

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

export async function initializeDurability(
  config: AppConfig,
  instances?: ServiceInstances,
): Promise<DurabilityCoordinator | undefined> {
  if (!usesDurability(config)) return undefined;
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
  instances?.shutdownHandlers.push({
    name: "durability-globals",
    phase: "postgres",
    handler: () => clearDurabilityClient(),
  });
  const acceleration = config.services?.durability?.acceleration;
  const enabled = acceleration?.enabled ?? config.services?.durability?.wakeups;
  return new ProcessDurabilityCoordinator({
    mode: enabled === false || !config.projectConfig.redisUrl
      ? "disabled"
      : "degraded",
    healthySafetyPollIntervalMs:
      acceleration?.healthySafetyPollIntervalMs ?? 30_000,
    degradedMaxPollIntervalMs:
      acceleration?.degradedMaxPollIntervalMs ??
      config.services?.durability?.pollIntervalMs ??
      5_000,
  });
}
