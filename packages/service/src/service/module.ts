import { z } from "@damatjs/deps/zod";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { TransactionOptions } from "@damatjs/orm-type";
import { PoolManager } from "../manager/pool";
import {
  createModelMethods,
  defineModelAccessors,
  resolveModelMethods,
} from "./modelAccessors";
import { createModuleState } from "./moduleState";
import type { ModelMethods } from "./methods";
import type { ModuleServiceConstructor } from "./moduleTypes";
import type { ModuleServiceConfig, ModelsMap } from "./type";

export function ModuleService<
  TModels extends ModelsMap,
  TCredentialsSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(
  config: ModuleServiceConfig<TModels, TCredentialsSchema>,
): ModuleServiceConstructor<TModels, TCredentialsSchema> {
  const { models } = config;
  const state = createModuleState(models, config);

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
      state.initialize(this, this.em);
    }

    get em() {
      return PoolManager.getPgEntityManager();
    }
    get getModels() {
      return this.models;
    }
    get inTransaction(): boolean {
      return state.transactions(this).inTransaction;
    }
    [resolveModelMethods](name: string): ModelMethods {
      return state.accessor(this, name);
    }
    transaction<R>(
      callback: (executor: DurabilityExecutor) => Promise<R>,
      options?: TransactionOptions,
    ): Promise<R> {
      return state
        .transactions(this)
        .run(
          this.em,
          (tx) => createModelMethods(models, this.em, config, tx),
          callback,
          options,
        );
    }
  }

  defineModelAccessors(GeneratedModuleService.prototype, models);
  return GeneratedModuleService as ModuleServiceConstructor<
    TModels,
    TCredentialsSchema
  >;
}
