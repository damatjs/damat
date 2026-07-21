import type { z } from "@damatjs/deps/zod";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { PgEntityManager } from "@damatjs/orm-pg";
import type { TransactionOptions } from "@damatjs/orm-type";
import type { ModelMethods } from "./methods";
import type { ModelsMap, ToCamelCase } from "./type";

type Credentials<TSchema extends z.ZodObject<z.ZodRawShape> | undefined> =
  TSchema extends z.ZodObject<z.ZodRawShape> ? z.infer<TSchema> : undefined;

export type ModelAccessors<TModels extends ModelsMap> = {
  [
    K in keyof TModels as K extends string ? ToCamelCase<K> : never
  ]: ModelMethods;
};

export type ModuleServiceInstance<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = ModelAccessors<TModels> & {
  credentials?: Credentials<TSchema>;
  models: ModelDefinition[];
  readonly em: PgEntityManager;
  readonly getModels: ModelDefinition[];
  readonly inTransaction: boolean;
  transaction<R>(
    callback: (executor: DurabilityExecutor) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R>;
};

export type ModuleServiceConstructor<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = abstract new (
  credentials?: Credentials<TSchema>,
) => ModuleServiceInstance<TModels, TSchema>;
