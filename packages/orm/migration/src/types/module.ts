import type {
  ModelDefinition,
  ModelProperties,
} from "@damatjs/orm-model/types";

// =============================================================================
// MODULE DEFINITION
// =============================================================================

/**
 * Database module definition.
 * Each feature module registers its migrations path and models here.
 */
export interface DatabaseModule {
  /** Unique module name */
  name: string;
  /** Model definitions for schema snapshot and migration generation.
   *  Auto-discovered from {modulesDir}/{name}/models/ when not provided. */
  models?: ModelDefinition<ModelProperties>[];
  /** Path to migrations directory (relative to modulesDir/{name}) */
  migrationsPath?: string;
}

/**
 * Database module registry.
 * Maps module names to their definitions.
 */
export type DatabaseModuleRegistry = Record<string, DatabaseModule>;
