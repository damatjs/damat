import type {
  ModelDefinition,
  ModelProperties,
} from "@damatjs/orm-model/types";
import type { ModuleSnapshot } from "../../types/snapshot";
import { buildSnapshot } from "../build";
import { loadSnapshot } from "../load";
import { saveSnapshot } from "../save";

/**
 * Build the current snapshot from `models` and persist it.
 * Replaces whatever snapshot was on disk for this module.
 *
 * @param migrationsDir  Absolute path to the module's migrations directory
 * @param moduleName     Module label
 * @param models         All model definitions owned by this module
 * @param namespaces     PostgreSQL namespaces (defaults to `["public"]`)
 */
export function captureSnapshot(
  migrationsDir: string,
  moduleName: string,
  models: ModelDefinition<ModelProperties>[],
  namespaces?: string[],
): ModuleSnapshot {
  const snapshot = buildSnapshot(moduleName, models, namespaces);
  saveSnapshot(migrationsDir, snapshot);
  return snapshot;
}

/**
 * Build the current snapshot and return it alongside the previously persisted
 * one — without writing anything to disk. Use this to inspect what would
 * change before committing.
 *
 * @param migrationsDir  Absolute path to the module's migrations directory
 * @param moduleName     Module label
 * @param models         All model definitions owned by this module
 * @param namespaces     PostgreSQL namespaces (defaults to `["public"]`)
 */
export function compareSnapshots(
  migrationsDir: string,
  moduleName: string,
  models: ModelDefinition<ModelProperties>[],
  namespaces?: string[],
): { previous: ModuleSnapshot; current: ModuleSnapshot } {
  return {
    previous: loadSnapshot(migrationsDir),
    current: buildSnapshot(moduleName, models, namespaces),
  };
}
