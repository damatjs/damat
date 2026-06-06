import { ModelDefinition } from "@/schema";
import { getRegisteredModel } from "./registry";

/**
 * Derive a default logical name from a table name.
 * Strips a trailing "s" so `"users"` → `"user"`, `"orders"` → `"order"`.
 * Used as the fallback `mappedBy` value when none is provided.
 *
 * @internal
 */
export function removeLastS(tableName: string): string {
  return tableName.endsWith("s") && tableName.length > 1
    ? tableName.slice(0, -1)
    : tableName;
}

// ─── Module Target ─────────────────────────────────────────────────────────────

/**
 * A lazy model reference - a function that returns a model.
 * Uses `any` return type to prevent TypeScript from trying to infer
 * the return type during type checking, which would cause circular
 * dependency errors.
 */
export type LazyModel = () => any;

/**
 * A relation target can be:
 *   - A `ModelDefinition` instance (direct reference)
 *   - A lazy thunk `() => ModelDefinition` (defers resolution for circular refs)
 *   - A `string` table name (resolved via the global model registry — eliminates circular imports entirely)
 *
 * ```ts
 * belongsTo(UserSchema)           // direct
 * belongsTo(() => UserSchema)     // lazy — for circular refs
 * hasMany("posts")                // string — no import needed
 * ```
 */
export type ModelTarget = ModelDefinition | LazyModel | string;

/** Resolve a target thunk (or plain model or string) to the concrete model. */
export function resolveModuleTarget(target: ModelTarget): ModelDefinition {
  if (typeof target === "string") {
    const model = getRegisteredModel(target);
    if (!model) {
      throw new Error(
        `Model for table "${target}" not found in registry. ` +
        `Ensure the model is defined before resolving relations. ` +
        `If using string-based targets, all models must be imported/loaded before relation resolution.`,
      );
    }
    return model as ModelDefinition;
  }
  const resolved = typeof target === "function" ? target() : target;
  return resolved as ModelDefinition;
}
