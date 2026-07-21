import { getLogger } from "@damatjs/logger";
import {
  cacheGet,
  cacheSetTagged,
  hasRedis,
  invalidateCacheTags,
} from "@damatjs/redis";
import type { QueryResultRow } from "@damatjs/orm-type";
import type { ModelMethods } from "../methods";
import type { CacheReadOptions, ServiceCacheConfig } from "../type";
import { modelCacheTag } from "./tag";
import {
  DEFAULT_TTL_SECONDS,
  READ_OPTIONS_ARG,
  WRITE_METHODS,
} from "./constant";
import { buildCacheKey } from "./buildCacheKey";

/**
 * Redis-backed, opt-in read cache for ModelMethods
 *
 *   - a read is cached ONLY when the call passes `cache: true | { ttl, tags }`
 *     (nothing is cached by default);
 *   - every entry carries the implicit `model:<name>` tag;
 *   - every write (create/update/delete/…) invalidates that tag, so cached
 *     reads never outlive a mutation by more than the write's round-trip;
 *   - `invalidateCacheTags([...])` (re-exported from @damatjs/redis) is the
 *     manual reset for custom tags or cross-model groups.
 *
 * Redis being missing or down never breaks a read — it falls through to the
 * database with a debug log. Reads inside a transaction always hit the
 * database (a transaction must see its own writes).
 */

/**
 * Wrap a ModelMethods instance with the tagged read cache. Applied by
 * ModuleService when the service config carries `cache` — without that (or
 * without a per-call `cache` option) every call behaves exactly as before.
 */
export function withTaggedCache<T extends QueryResultRow>(
  methods: ModelMethods<T>,
  modelName: string,
  config: ServiceCacheConfig,
): ModelMethods<T> {
  const prefix = config.prefix ?? "svc";
  const defaultTtl = config.defaultTtl ?? DEFAULT_TTL_SECONDS;

  return new Proxy(methods, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string") return value;

      if (prop in READ_OPTIONS_ARG) {
        return async (...args: unknown[]) => {
          const optIndex = READ_OPTIONS_ARG[prop]!;
          const options = args[optIndex] as
            { cache?: boolean | CacheReadOptions } | undefined;
          const cacheOpt =
            options && typeof options === "object" ? options.cache : undefined;

          // The cache option is ours, not the repository's — strip it before
          // the underlying method sees the options.
          if (cacheOpt !== undefined) {
            const { cache: _cache, ...rest } = options!;
            args = [...args];
            args[optIndex] = rest;
          }

          // In-transaction reads must see the transaction's own writes.
          const inTransaction =
            (target as unknown as { transactionalEm?: unknown })
              .transactionalEm != null;
          if (!cacheOpt || inTransaction || !hasRedis()) {
            return (value as (...a: unknown[]) => unknown).apply(target, args);
          }

          const read: CacheReadOptions = cacheOpt === true ? {} : cacheOpt;
          const key = buildCacheKey(prefix, modelName, prop, args);

          try {
            const hit = await cacheGet(key);
            if (hit !== null) return hit;
          } catch (e) {
            getLogger().debug(
              "cache read failed — falling through to the database",
              {
                model: modelName,
                method: prop,
                error: e instanceof Error ? e.message : String(e),
              },
            );
          }

          const result = await (value as (...a: unknown[]) => unknown).apply(
            target,
            args,
          );

          // null/undefined are not cached: cacheGet can't tell a cached null
          // from a miss, so negative results always recompute.
          if (result !== null && result !== undefined) {
            try {
              await cacheSetTagged(key, result, read.ttl ?? defaultTtl, [
                modelCacheTag(modelName),
                ...(read.tags ?? []),
              ]);
            } catch (e) {
              getLogger().debug(
                "cache write failed — result served from the database",
                {
                  model: modelName,
                  method: prop,
                  error: e instanceof Error ? e.message : String(e),
                },
              );
            }
          }
          return result;
        };
      }

      if (WRITE_METHODS.has(prop)) {
        return async (...args: unknown[]) => {
          const result = await (value as (...a: unknown[]) => unknown).apply(
            target,
            args,
          );
          if (hasRedis()) {
            try {
              await invalidateCacheTags([modelCacheTag(modelName)]);
            } catch (e) {
              getLogger().debug(
                "cache invalidation failed — entries expire by TTL",
                {
                  model: modelName,
                  method: prop,
                  error: e instanceof Error ? e.message : String(e),
                },
              );
            }
          }
          return result;
        };
      }

      return value;
    },
  });
}
