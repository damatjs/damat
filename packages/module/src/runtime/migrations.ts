import { join } from "node:path";
import {
  collectSystemMigrations,
  durabilitySystemMigrations,
  type SystemMigrationCatalog,
} from "@damatjs/durability";
import { eventsSystemMigrations } from "@damatjs/events/migrations";
import { jobsSystemMigrations } from "@damatjs/jobs/migrations";
import { runMigrations } from "@damatjs/orm-migration";
import type { Pool } from "@damatjs/orm-type";
import { pipelinesSystemMigrations } from "@damatjs/pipelines/migrations";
import type { ILogger } from "@damatjs/logger";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";
import type { ModuleRuntimeCapabilities } from "./capabilities";
import type { ModuleRuntimePlan } from "./plan";

export function capabilityMigrationCatalogs(
  capabilities: ModuleRuntimeCapabilities,
): SystemMigrationCatalog[] {
  if (!capabilities.durable) return [];
  return [
    durabilitySystemMigrations,
    ...(capabilities.jobs || capabilities.pipelines
      ? [jobsSystemMigrations]
      : []),
    ...(capabilities.events ? [eventsSystemMigrations] : []),
    ...(capabilities.pipelines ? [pipelinesSystemMigrations] : []),
  ];
}

export function standaloneMigrationCatalogs(
  plan: ModuleRuntimePlan,
): SystemMigrationCatalog[] {
  return capabilityMigrationCatalogs(plan.capabilities);
}

export async function applyStandaloneMigrations(
  pool: Pool,
  plan: ModuleRuntimePlan,
  logger: ILogger,
): Promise<void> {
  const systemMigrations = collectSystemMigrations(
    standaloneMigrationCatalogs(plan),
  );
  const path =
    plan.manifest.paths?.migrations ?? DEFAULT_MODULE_PATHS.migrations;
  const modules = plan.capabilities.migrations
    ? {
        [plan.manifest.name]: {
          id: plan.manifest.name,
          name: plan.manifest.name,
          path: plan.moduleDir,
          resolve: plan.moduleDir,
          migrations: join(plan.moduleDir, path),
        },
      }
    : {};
  if (!systemMigrations.length && !Object.keys(modules).length) return;
  const results = await runMigrations(pool, modules, { systemMigrations });
  const failure = results.find((result) => !result.success);
  if (failure) throw failure.error ?? new Error("Standalone migration failed");
  logger.info(`Migrations ready for module "${plan.manifest.name}"`);
}
