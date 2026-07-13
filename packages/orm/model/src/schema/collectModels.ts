import { ModelDefinition } from "./model";

/** snake_case / kebab-case / spaced → camelCase (type level). */
export type CamelizeTable<S extends string> =
  S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<CamelizeTable<Tail>>}`
    : S;

/** snake_case / kebab-case / spaced → camelCase (runtime; mirrors the type). */
function camelizeTable(name: string): string {
  return name
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part, i) =>
      i === 0
        ? part.charAt(0).toLowerCase() + part.slice(1)
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

/**
 * Build a module's `models` map from an ARRAY of model definitions — the key
 * is derived from each model's **table name** (camelCased), so you never
 * hand-write a redundant key. The table name is the single source of truth:
 *
 * ```ts
 * export const models = collectModels([UserModel, AccountModel, SessionModel]);
 * // → { users: UserModel, accounts: AccountModel, sessions: SessionModel }
 * ```
 *
 * The derived key is what `ModuleService` exposes as `service.<key>` and what
 * cross-module links reference, so all three (model, accessor, link) stay
 * aligned to the table name.
 */
export function collectModels<const T extends readonly ModelDefinition[]>(
  models: T,
): {
  [Name in T[number]["_tableName"] as CamelizeTable<Name>]: Extract<
    T[number],
    ModelDefinition<Name>
  >;
} {
  const out: Record<string, ModelDefinition> = {};
  for (const model of models) {
    out[camelizeTable(model._tableName)] = model;
  }
  return out as {
    [Name in T[number]["_tableName"] as CamelizeTable<Name>]: Extract<
      T[number],
      ModelDefinition<Name>
    >;
  };
}
