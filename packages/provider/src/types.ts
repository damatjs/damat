import type { z } from "@damatjs/deps/zod";
import type {
  ModelsMap,
  ModuleServiceConfig,
  ModuleServiceInstance,
} from "@damatjs/services";

export interface ProviderRegistry {
  // Provider standards and applications extend this interface.
}

export interface ProviderBinding {
  /** Id of the already configured and initialized Damat module. */
  module: string;
}

export type ProviderBindings = Record<string, ProviderBinding>;

export type ProviderServiceConfig<
  TModels extends ModelsMap = ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  TRole extends string = string,
> = ModuleServiceConfig<TModels, TSchema> & {
  /** Stable role used by the backend provider binding, such as `auth`. */
  role: TRole;
};

export type ProviderServiceInstance<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
  TRole extends string = string,
> = ModuleServiceInstance<TModels, TSchema> & {
  readonly providerRole: TRole;
};

export type ServiceCredentials<
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
> = TSchema extends z.ZodTypeAny ? z.infer<TSchema> : undefined;

export type ProviderServiceConstructor<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined,
  TRole extends string,
> = (abstract new (
  credentials?: ServiceCredentials<TSchema>,
) => ProviderServiceInstance<TModels, TSchema, TRole>) & {
  readonly providerRole: TRole;
};
