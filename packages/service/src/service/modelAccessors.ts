import type { ModelDefinition } from "@damatjs/orm-model";
import type {
  PgEntityManager,
  TransactionalEntityManager,
} from "@damatjs/orm-pg";
import { toCamelCase } from "@/util/string";
import { withTaggedCache } from "./cache";
import { withModelEvents } from "./events";
import { withQueryLogging } from "./logging";
import { ModelMethods } from "./methods";
import type { ModelsMap, ServiceCacheConfig, ToCamelCase } from "./type";

export const resolveModelMethods = Symbol("resolveModelMethods");

export type ModelAccessors<TModels extends ModelsMap> = {
  [
    K in keyof TModels as K extends string ? ToCamelCase<K> : never
  ]: ModelMethods;
};

interface ModelAccessorOptions {
  cache?: ServiceCacheConfig;
  events?: boolean;
  logQueries?: boolean;
}

export function createModelMethods(
  models: ModelsMap,
  em: PgEntityManager,
  config: ModelAccessorOptions,
  transaction?: TransactionalEntityManager,
): Map<string, ModelMethods> {
  const methods = new Map<string, ModelMethods>();
  for (const [name, definition] of Object.entries(models)) {
    let accessor = new ModelMethods(definition, name, em);
    if (transaction) accessor.setTransactionalEm(transaction);
    if (config.cache) accessor = withTaggedCache(accessor, name, config.cache);
    if (config.events) accessor = withModelEvents(accessor, name);
    if (config.logQueries) accessor = withQueryLogging(accessor, name);
    methods.set(name, accessor);
  }
  return methods;
}

export function registerModels(models: ModelsMap, em: PgEntityManager): void {
  for (const [name, definition] of Object.entries(models)) {
    em.registerModel(name, definition as ModelDefinition);
  }
}

export function defineModelAccessors(
  prototype: object,
  models: ModelsMap,
): void {
  for (const name of Object.keys(models)) {
    Object.defineProperty(prototype, toCamelCase(name), {
      get(this: { [resolveModelMethods](name: string): ModelMethods }) {
        return this[resolveModelMethods](name);
      },
      enumerable: true,
      configurable: true,
    });
  }
}
