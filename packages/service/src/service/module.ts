import { z } from "@damatjs/deps/zod";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { TransactionOptions } from "@damatjs/orm-type";
import { PoolManager } from "../manager/pool";
import {
  createModelMethods,
  defineModelAccessors,
  type ModelAccessors,
  registerModels,
  resolveModelMethods,
} from "./modelAccessors";
import { ServiceTransactions } from "./transaction";
import type { ModelMethods } from "./methods";
import type { ModuleServiceConfig, ModelsMap } from "./type";

export function ModuleService<
  TModels extends ModelsMap,
  TCredentialsSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(config: ModuleServiceConfig<TModels, TCredentialsSchema>) {
  const { models } = config;
  const methodsByService = new WeakMap<object, Map<string, ModelMethods>>();
  const transactionsByService = new WeakMap<object, ServiceTransactions>();
  const getTransactions = (service: object) => {
    const state = transactionsByService.get(service);
    if (!state) throw new Error("Service transaction state is unavailable");
    return state;
  };
  const getMethods = (service: object) => {
    const methods = methodsByService.get(service);
    if (!methods) throw new Error("Service model methods are unavailable");
    return methods;
  };

  abstract class GeneratedModuleService {
    credentials?: TCredentialsSchema extends z.ZodTypeAny
      ? z.infer<TCredentialsSchema>
      : undefined;
    models: ModelDefinition[] = [];

    constructor(passedCredentials?: unknown) {
      if (config.credentialsSchema) {
        this.credentials = config.credentialsSchema.parse(
          passedCredentials,
        ) as never;
      }
      if (!PoolManager.isInitialized()) {
        throw new Error(
          "PoolManager not initialized. Call PoolManager.setup(pool) before creating service instances.",
        );
      }
      this.models = Object.values(models);
      registerModels(models, this.em);
      methodsByService.set(this, createModelMethods(models, this.em, config));
      transactionsByService.set(this, new ServiceTransactions());
    }

    get em() {
      return PoolManager.getPgEntityManager();
    }
    get getModels() {
      return this.models;
    }
    get inTransaction(): boolean {
      return getTransactions(this).inTransaction;
    }
    [resolveModelMethods](name: string): ModelMethods {
      return getTransactions(this).resolve(name, getMethods(this));
    }
    transaction<R>(
      callback: (executor: DurabilityExecutor) => Promise<R>,
      options?: TransactionOptions,
    ): Promise<R> {
      return getTransactions(this).run(
        this.em,
        (tx) => createModelMethods(models, this.em, config, tx),
        callback,
        options,
      );
    }
  }

  defineModelAccessors(GeneratedModuleService.prototype, models);
  return GeneratedModuleService as abstract new (
    credentials?: TCredentialsSchema extends z.ZodObject<z.ZodRawShape>
      ? z.infer<TCredentialsSchema>
      : undefined,
  ) => GeneratedModuleService & ModelAccessors<TModels>;
}
