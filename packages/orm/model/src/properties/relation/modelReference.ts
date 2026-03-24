import type { ModelDefinition, ModelProperties } from "@/types";

/**
 * A reference to a model — either the model definition itself (direct) or
 * a zero-argument function that returns one (lazy, for circular references).
 *
 * Both forms work:
 *   - Direct:  `model.belongsTo(ProductSchema)`
 *   - Lazy:    `model.belongsTo(() => ProductSchema)` — use this when two
 *              models import each other to break the TS circular-init error.
 *
 * The generic `T` is inferred automatically; you never need to annotate it.
 * The lazy form's return type is inferred from what the arrow returns — no
 * `ModelDefinition<ModelProperties>` annotation required in the caller.
 */
export type ModelReference<T extends ModelProperties = ModelProperties> =
  | ModelDefinition<T>
  | (() => ModelDefinition<T>)
  | (() => { _tableName: string });

/**
 * Extract the ModelProperties type from a ModelReference.
 * Used by builder generics to carry the target model's property map.
 */
export type InferModelProperties<R> =
  R extends ModelDefinition<infer T>
    ? T
    : R extends () => ModelDefinition<infer T>
      ? T
      : ModelProperties;

/**
 * Resolve a ModelReference to its table name string.
 */
export function resolveModelReference<T extends ModelProperties>(
  ref: ModelReference<T>,
): string {
  if (typeof ref === "function") {
    return ref()._tableName;
  }
  return ref._tableName;
}

/**
 * Wrap a ModelReference in a lazy thunk that returns the table name.
 * Used internally so builders only store `() => string` rather than the
 * full model object (keeps the builder types lean).
 */
export function createLazyReference<T extends ModelProperties>(
  ref: ModelReference<T>,
): () => string {
  return () => resolveModelReference(ref);
}
