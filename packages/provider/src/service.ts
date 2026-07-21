import type { z } from "@damatjs/deps/zod";
import { ModuleService, type ModelsMap } from "@damatjs/services";
import type {
  ProviderServiceConfig,
  ProviderServiceConstructor,
} from "./types";

export function ProviderService<
  TModels extends ModelsMap,
  TSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  TRole extends string = string,
>(
  config: ProviderServiceConfig<TModels, TSchema, TRole>,
): ProviderServiceConstructor<TModels, TSchema, TRole> {
  const { role, ...moduleConfig } = config;
  const Base = ModuleService(moduleConfig) as unknown as abstract new (
    credentials?: unknown,
  ) => object;

  abstract class GeneratedProviderService extends Base {
    static readonly providerRole = role;
    readonly providerRole = role;

    constructor(credentials?: unknown) {
      super(credentials);
    }
  }

  return GeneratedProviderService as unknown as ProviderServiceConstructor<
    TModels,
    TSchema,
    TRole
  >;
}
