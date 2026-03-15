import type { EntityClass } from "@damatjs/deps/mikro-orm/postgresql";
import type {
  ModelDefinition,
  ModelProperties,
} from "@damatjs/orm-model/types";

// =============================================================================
// MODULE DEFINITION
// =============================================================================

/**
 * Database module definition.
 * Each feature module registers its entities and migrations path here.
 */
export interface DatabaseModule {
  /** Unique module name */
  name: string;
  /** Entity classes owned by this module (used by MikroORM) */
  entities: EntityClass<any>[];
  /** Model definitions for schema snapshot and migration generation */
  models: ModelDefinition<ModelProperties>[];
  /** Path to migrations directory (relative to module) */
  migrationsPath?: string;
}

/**
 * Database module registry.
 * Maps module names to their definitions.
 */
export type DatabaseModuleRegistry = Record<string, DatabaseModule>;
