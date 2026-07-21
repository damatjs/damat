import { z } from "@damatjs/deps/zod";

export interface ModuleCredentials<
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  schema: TSchema;
  load: (env: NodeJS.ProcessEnv) => z.infer<TSchema>;
}

export interface ModuleDefinition<TService> {
  service: new (credentials: any) => TService;
  credentials: (env: NodeJS.ProcessEnv) => any;
}

export interface ModuleInstance<TService> {
  readonly name: string;
  readonly service: TService;
  readonly credentials: unknown;
  /**
   * Instantiate (or re-instantiate) the service, binding it to the
   * current pool/entity manager, and return it.
   */
  init(): TService;
}

/**
 * Map of module id -> service type, extended by apps via declaration merging:
 *
 * ```ts
 * declare module "@damatjs/services" {
 *   interface ModuleRegistry {
 *     user: UserModuleService;
 *   }
 * }
 * ```
 *
 * Once augmented, `getModule("user")` from @damatjs/framework is fully typed.
 */
export interface ModuleRegistry {
  // Projects extend this interface via declaration merging
}
