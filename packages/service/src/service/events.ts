import { getEventBus } from "@damatjs/events";
import type { QueryResultRow } from "@damatjs/orm-type";
import type { ModelMethods } from "./methods";

/**
 * Opt-in model CRUD events: with `events: true` on the service config, every
 * successful write emits `<model>.<kind>` on the global event bus —
 * subscribers get `{ model, method, result }`. Emission is awaited so a
 * subscriber's side effects happen before the write call returns, but the
 * bus isolates subscriber errors (they are logged, never thrown back here).
 */

/** Write method → the event kind it emits. `upsert*` counts as "updated". */
const WRITE_EVENT_KINDS: Record<string, "created" | "updated" | "deleted"> = {
  create: "created",
  createMany: "created",
  upsert: "updated",
  upsertMany: "updated",
  update: "updated",
  updateOne: "updated",
  restore: "updated",
  delete: "deleted",
  softDelete: "deleted",
};

/** The event name a model write emits ("user" + "created" → "user.created"). */
export function modelEventName(modelName: string, kind: "created" | "updated" | "deleted"): string {
  return `${modelName}.${kind}`;
}

/** The payload model CRUD events carry. */
export interface ModelEventPayload {
  model: string;
  method: string;
  /** Whatever the write returned (row, rows, or count). */
  result: unknown;
}

export function withModelEvents<T extends QueryResultRow>(
  methods: ModelMethods<T>,
  modelName: string,
): ModelMethods<T> {
  return new Proxy(methods, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string") return value;
      const kind = WRITE_EVENT_KINDS[prop];
      if (!kind) return value;

      return async (...args: unknown[]) => {
        const result = await (value as (...a: unknown[]) => unknown).apply(target, args);
        const payload: ModelEventPayload = { model: modelName, method: prop, result };
        await getEventBus().emit(modelEventName(modelName, kind), payload);
        return result;
      };
    },
  });
}
