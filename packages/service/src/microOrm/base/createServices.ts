import { EntityManager } from "@damatjs/deps/mikro-orm/core";
import { EntitiesConfig, ServicesMap } from "./types";
import { createEntityService } from "./createEntityService";

/**
 * Creates services for multiple entity classes
 *
 * @example
 * ```ts
 * import { User, Post, Comment } from './entities';
 *
 * const services = createServices(em, {
 *   user: { entityClass: User },
 *   post: { entityClass: Post },
 *   comment: { entityClass: Comment },
 * });
 *
 * // Use individual services
 * const user = await services.user.create({ name: 'John' });
 * const posts = await services.post.findAll({ authorId: user.id });
 * const count = await services.comment.count({ postId: posts[0].id });
 * ```
 */
export function createServices<T extends EntitiesConfig>(
  em: EntityManager,
  entities: T,
): ServicesMap<T> {
  const services = {} as ServicesMap<T>;

  for (const [name, config] of Object.entries(entities)) {
    (services as any)[name] = createEntityService(em, config.entityClass);
  }

  return services;
}
