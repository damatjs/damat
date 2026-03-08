import { EntityManager } from "@damatjs/deps/mikro-orm/core";
import { EntityClass, EntityService } from "./types";
import { createEntityService } from "./createEntityService";

/**
 * Creates services for multiple entity classes using just the class constructors
 * The keys will be used as service names
 *
 * @example
 * ```ts
 * import { User, Post, Comment } from './entities';
 *
 * const services = createServicesFromClasses(em, {
 *   user: User,
 *   post: Post,
 *   comment: Comment,
 * });
 *
 * // Use individual services
 * const user = await services.user.create({ name: 'John' });
 * const posts = await services.post.findAll({ authorId: user.id });
 * ```
 */
export function createServicesFromClasses<
  T extends Record<string, EntityClass<any>>,
>(
  em: EntityManager,
  entityClasses: T,
): {
    [K in keyof T]: T[K] extends EntityClass<infer E> ? EntityService<E> : never;
  } {
  const services = {} as any;

  for (const [name, entityClass] of Object.entries(entityClasses)) {
    services[name] = createEntityService(em, entityClass);
  }

  return services;
}
