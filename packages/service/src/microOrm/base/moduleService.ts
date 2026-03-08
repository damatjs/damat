import { EntityManager } from "@damatjs/deps/mikro-orm/core";
import { EntityClass, EntityService } from "./types";
import { createEntityService } from "./createEntityService";
import { BaseEntity } from "../types";
import { z } from "@damatjs/deps/zod";

/**
 * Map of entity classes keyed by name - uses local EntityClass for type safety
 */
type EntityClasses = Record<string, EntityClass<BaseEntity>>;

/**
 * Extracts the instance type from a class constructor
 */
type InstanceOf<T> = T extends new (...args: any[]) => infer I ? I : never;

/**
 * Generated services type from entity classes map
 */
type GeneratedServices<T extends EntityClasses> = {
  [K in keyof T]: EntityService<InstanceOf<T[K]>>;
};

/**
 * Maps entity classes to their MikroORM EntityClass types
 * This ensures the entities can be passed directly to MikroORM methods
 */
type EntityClassMap<T extends EntityClasses> = {
  [K in keyof T]: T[K] extends EntityClass<infer E> ? EntityClass<E> : never;
};

/**
 * Base class with generated services
 */
type ModuleServiceBase<T extends EntityClasses, TCredentials extends Record<string, unknown> = Record<string, unknown>> = {
  new(em: EntityManager, credentials: TCredentials): GeneratedServices<T> & { em: EntityManager; entities: EntityClassMap<T>; credentials: TCredentials };
};

/**
 * Creates a base service class with CRUD operations for multiple entities.
 * Similar to Medusa's MedusaService pattern.
 *
 * Pass an optional Zod schema as the second argument to get typed `this.credentials`.
 *
 * @example
 * ```ts
 * import { ModuleService } from "@damatjs/services";
 * import { User, Account, Session } from "./models";
 * import { schema } from "./config/schema";
 *
 * class UserModuleService extends ModuleService({
 *   user: User,
 *   account: Account,
 *   session: Session,
 * }, schema) {
 *   // this.credentials is fully typed from the schema
 *   async getSecret() {
 *     return this.credentials.betterAuth.betterAuthSecret;
 *   }
 * }
 * ```
 */
export function ModuleService<
  T extends EntityClasses,
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
>(
  entities: T,
  _credentialsSchema?: TSchema,
): ModuleServiceBase<T, z.infer<TSchema>> {
  class GeneratedModuleService {
    public readonly em: EntityManager | null = null;
    public readonly entities: T;
    public readonly credentials: z.infer<TSchema> = {} as z.infer<TSchema>;

    constructor(em: EntityManager, credentials?: z.infer<TSchema>) {
      this.entities = entities;
      if (em) {
        this.em = em;
        // Generate services for each entity
        for (const [name, entityClass] of Object.entries(entities)) {
          (this as any)[name] = createEntityService(em, entityClass);
        }
      }
      if (credentials) {
        this.credentials = credentials;
      }
    }
  }

  return GeneratedModuleService as unknown as ModuleServiceBase<T, z.infer<TSchema>>;
}
