import type { ModelDefinition, PropertyValue } from "@damatjs/orm-model";

/**
 * One side of a link — a model that lives inside a specific module.
 *
 * `model` is the **key under which the model is registered in that module's
 * `models` map** (the same value that becomes the module-service accessor, e.g.
 * the `user` module registers its user model under the key `user`). It is NOT
 * necessarily the database table name. The link's junction row stores the
 * referenced row's `primaryKey` value, and cross-module fetches hydrate through
 * `getModule(module)[toCamelCase(model)]`.
 */
export interface LinkEndpoint {
  /** Module id, as registered in `damat.config.ts` / resolvable via `getModule`. */
  module: string;
  /** Key of the model in that module's `models` map (drives the service accessor). */
  model: string;
  /**
   * Column on the source row that identifies it. Default: the model's actual
   * primary key when it is resolvable through the global model registry at
   * definition time, else `"id"`.
   */
  primaryKey?: string;
  /** Field name this side is exposed as when querying (graph). Default: `model`. */
  field?: string;
  /** Whether this side is a collection (`true` for many-to-many). Default: `true`. */
  isList?: boolean;
}

/** A fully-resolved endpoint (defaults applied). */
export interface ResolvedEndpoint {
  module: string;
  model: string;
  /**
   * The model's real database table name — resolved from the global model
   * registry when the model is loaded, else derived from the key by the
   * `collectModels` convention (camelCase key -> snake_case table). Junction
   * table and column names derive from this, never from the raw key.
   */
  table: string;
  primaryKey: string;
  alias: string;
  isList: boolean;
}

export interface LinkOptions {
  /** Override the generated junction table name. */
  pivotTable?: string;
  /** Override the generated junction column name(s), per side. */
  pivotColumns?: { left?: string; right?: string };
  /** Prefix used to generate junction-row ids. Default: `"link"`. */
  idPrefix?: string;
  database?: {
    /**
     * Emit real DB foreign keys from the junction table to both module tables.
     * Off by default to preserve module isolation (and avoid coupling the link
     * migration to both modules' ordering) — the Medusa convention.
     */
    foreignKeys?: boolean;
    /** Extra columns to add to the junction table. */
    extraColumns?: Record<string, PropertyValue>;
  };
}

/**
 * The product of `defineLink` — both resolved endpoints plus the generated
 * junction `ModelDefinition` and the column/identifier names derived for it.
 */
export interface LinkDefinition {
  left: ResolvedEndpoint;
  right: ResolvedEndpoint;
  /** Database table name of the junction table (snake_case). */
  pivotTable: string;
  /** Key the junction model is registered under (camelCase; service accessor). */
  pivotName: string;
  /** Junction column holding the left side's id. */
  leftColumn: string;
  /** Junction column holding the right side's id. */
  rightColumn: string;
  /** The generated junction model (a normal ORM model, so it migrates/codegens). */
  model: ModelDefinition;
  options: LinkOptions;
}

/** A reference to a concrete row on one side of a link. */
export interface LinkRowRef {
  /** Module id (optional — inferred from the link when unambiguous). */
  module?: string;
  /** Model-map key of the row's model. */
  model: string;
  /** The row's id (its `primaryKey` value). */
  id: string;
}

/** A reference to a model (no specific row) — the target of a fetch/graph hop. */
export interface LinkModelRef {
  module?: string;
  model: string;
}
