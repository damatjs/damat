import { z } from "@damatjs/deps/zod";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { TransactionOptions } from "@damatjs/orm-type";
import { PoolManager } from "../manager/pool";
import { ModelMethods } from "./methods";
import { ModuleServiceConfig, ModelsMap, ToCamelCase } from "./type";
import { toCamelCase } from "@/util/string";

export function ModuleService<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(config: ModuleServiceConfig<TModels, TSchema>) {
  const { models } = config;

  const modelMethodsMap = new Map<string, ModelMethods<any>>();

  abstract class GeneratedModuleService {
    credentials: TSchema extends z.ZodObject<z.ZodRawShape> ? z.infer<TSchema> : undefined;
    inTransaction: boolean = false;
    models: ModelDefinition[] = [];

    constructor(credentials?: TSchema extends z.ZodObject<z.ZodRawShape> ? z.infer<TSchema> : undefined) {
      this.credentials = credentials as any;

      this.models = Object.values(models);

      if (!PoolManager.isInitialized()) {
        throw new Error("PoolManager not initialized. Call PoolManager.setup(pool) before creating service instances.");
      }

      const em = PoolManager.getPgEntityManager();

      for (const [modelName, model] of Object.entries(models)) {
        em.registerModel(modelName, model as ModelDefinition);
        const methods = new ModelMethods(model as ModelDefinition, modelName);
        modelMethodsMap.set(modelName, methods);
      }
    }

    get em() {
      return PoolManager.getPgEntityManager();
    }

    get getModels() {
      return this.models;
    }

    async transaction<R>(
      callback: () => Promise<R>,
      options?: TransactionOptions
    ): Promise<R> {
      if (this.inTransaction) {
        return callback();
      }

      const em = PoolManager.getPgEntityManager();

      return em.transaction(async (tx) => {
        this.inTransaction = true;

        for (const [modelName] of Object.entries(models)) {
          const methods = modelMethodsMap.get(modelName);
          if (methods) {
            methods.setTransactionalEm(tx);
          }
        }

        try {
          const result = await callback();
          return result;
        } finally {
          this.inTransaction = false;

          for (const [modelName] of Object.entries(models)) {
            const methods = modelMethodsMap.get(modelName);
            if (methods) {
              methods.setTransactionalEm(null);
            }
          }
        }
      }, options);
    }
  }

  type ModelAccessors = {
    [K in keyof TModels as K extends string ? ToCamelCase<K> : never]: ModelMethods;
  };

  for (const [modelName, modelDef] of Object.entries(models)) {
    const accessorName = toCamelCase(modelName);
    const model = modelDef as ModelDefinition;

    Object.defineProperty(GeneratedModuleService.prototype, accessorName, {
      get(): ModelMethods {
        const existingMethods = modelMethodsMap.get(modelName);
        if (existingMethods) {
          return existingMethods;
        }
        const newMethods = new ModelMethods(model, modelName);
        modelMethodsMap.set(modelName, newMethods);
        return newMethods;
      },
      enumerable: true,
      configurable: true,
    });
  }

  return GeneratedModuleService as abstract new (
    credentials?: TSchema extends z.ZodObject<z.ZodRawShape> ? z.infer<TSchema> : undefined
  ) => GeneratedModuleService & ModelAccessors;
}
