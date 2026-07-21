import { getLogger } from "@damatjs/logger";
import type { QueryResultRow } from "@damatjs/orm-type";
import type { ModelMethods } from "./methods";

/** The CRUD surface worth timing — bookkeeping methods stay unwrapped. */
const LOGGED_METHODS = new Set([
  "create",
  "createMany",
  "upsert",
  "upsertMany",
  "find",
  "findMany",
  "findById",
  "findOne",
  "update",
  "updateOne",
  "delete",
  "softDelete",
  "restore",
  "count",
  "exists",
]);

/**
 * Wrap a ModelMethods instance so every CRUD call emits one debug-level
 * `query` log with the model, method, and duration. Opt-in via the service
 * config's `logQueries` flag. No SQL text or parameter values are logged —
 * payloads may carry PII.
 */
export function withQueryLogging<T extends QueryResultRow>(
  methods: ModelMethods<T>,
  model: string,
): ModelMethods<T> {
  return new Proxy(methods, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (
        typeof value !== "function" ||
        typeof prop !== "string" ||
        !LOGGED_METHODS.has(prop)
      ) {
        return value;
      }
      return async (...args: unknown[]) => {
        const start = Date.now();
        try {
          return await (value as (...a: unknown[]) => unknown).apply(
            target,
            args,
          );
        } finally {
          getLogger().debug("query", {
            model,
            method: prop,
            durationMs: Date.now() - start,
          });
        }
      };
    },
  });
}
