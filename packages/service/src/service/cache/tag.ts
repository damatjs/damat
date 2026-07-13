/** The implicit invalidation tag every cached read of a model carries. */
export function modelCacheTag(modelName: string): string {
  return `model:${modelName}`;
}