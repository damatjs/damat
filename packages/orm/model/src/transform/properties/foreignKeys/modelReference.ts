// Type for model reference - can be a model object with name or a function returning one
export type ModelReference =
  | { _tableName: string }
  | (() => { _tableName: string });

/**
 * Resolve model reference to table name
 */
export function resolveModelReference(ref: ModelReference): string {
  if (typeof ref === "function") {
    return ref()._tableName;
  }
  return ref._tableName;
}

/**
 * Create a lazy model reference function
 */
export function createLazyReference(ref: ModelReference): () => string {
  return () => resolveModelReference(ref);
}
