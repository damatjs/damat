// ─── Global Model Registry ───────────────────────────────────────────────────

import { ModelDefinition } from '@/schema';

/**
 * A lightweight global registry that maps table names to their model definitions.
 * This enables string-based relation targets (e.g. `hasMany("accounts")`) to be
 * resolved at runtime without requiring circular imports.
 *
 * @internal
 */
const MODEL_REGISTRY = new Map<string, ModelDefinition>();

/** Register a model by its table name. Called automatically by ModelDefinition constructor. */
export function registerModel(tableName: string, model: ModelDefinition): void {
  MODEL_REGISTRY.set(tableName, model);
}

/** Look up a model by table name. Returns undefined if not registered. */
export function getRegisteredModel(tableName: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.get(tableName);
}

/** Check if a model is registered for a given table name. */
export function hasRegisteredModel(tableName: string): boolean {
  return MODEL_REGISTRY.has(tableName);
}
