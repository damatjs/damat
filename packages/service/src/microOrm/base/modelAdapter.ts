import type { ModelDefinition } from '@damatjs/orm-model';

/**
 * Adapts ModelDefinition to work with ModuleService.
 * ModuleService expects class constructors, but orm-model exports declarative definitions.
 * This adapter bridges the gap.
 */
export function asEntityClass<T = unknown>(modelDef: ModelDefinition): new () => T {
  const adapter = class {
    static readonly __modelDef = modelDef;
    static readonly tableName = modelDef._tableName;
  };
  
  Object.defineProperty(adapter, 'name', {
    value: modelDef._tableName,
    configurable: true,
  });
  
  return adapter as unknown as new () => T;
}

/**
 * Adapts a record of ModelDefinitions to EntityClasses
 */
export function adaptModels<T extends Record<string, ModelDefinition>>(
  models: T
): { [K in keyof T]: new () => unknown } {
  const result: Record<string, new () => unknown> = {};
  
  for (const [key, modelDef] of Object.entries(models)) {
    result[key] = asEntityClass(modelDef);
  }
  
  return result as { [K in keyof T]: new () => unknown };
}
