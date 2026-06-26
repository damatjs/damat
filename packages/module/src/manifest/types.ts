/**
 * Module manifest — the contract that makes a damat module portable.
 *
 * A self-contained module ships a `module.json` next to its `index.ts`.
 * `damat module add <source>` reads it to copy the module into an app,
 * register it in damat.config.ts, surface required env vars, and install
 * any npm packages it needs. The future module registry indexes modules
 * by the same manifest (see the `registry` block).
 */

export interface ModuleEnvVar {
  /** Environment variable name, e.g. "BETTER_AUTH_SECRET" */
  name: string;
  /** Whether the module fails to start without it. Default: true */
  required?: boolean;
  /** Shown to the user when the variable is missing */
  description?: string;
  /** Example value written to .env.example */
  example?: string;
}

/**
 * Module author identity. May be a string ("Name <email> (url)") or an object;
 * the registry mirrors it for search/display, and `damat module add` records it
 * as install provenance. The author declares this — it is not the verifiable
 * owner (that is assigned by the registry backend; see ModuleRegistryMeta).
 */
export interface ModuleAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * One side of a declared link rule. Structurally mirrors `@damatjs/link`'s
 * `LinkEndpoint`, but defined locally so the manifest package stays free of a
 * dependency on the link runtime.
 *
 * For the module's OWN side (`from`) the values are known at authoring time. For
 * the target side (`to`) `module`/`model`/`field` may be left blank ("") as
 * placeholders the backend owner fills before `damat module link-setup`.
 */
export interface ModuleLinkEndpoint {
  /** Module id. The module's own side is its own name; the target may be blank. */
  module?: string;
  /** Key in that module's `models` map (the service accessor). May be blank for the target. */
  model?: string;
  /** Field name this side is exposed as when querying. Default: `model`. */
  field?: string;
  /** Column on the source row that identifies it. Default: `"id"`. */
  primaryKey?: string;
  /** Whether this side is a collection. Default: `true`. */
  isList?: boolean;
}

/**
 * A cross-module link RULE a module declares. The module specifies its OWN side
 * (`from`, fully filled) and the SHAPE of the target (`to`, whose
 * module/model/field the backend owner completes). The module never creates the
 * connection — `damat module link-setup` materializes it into the app's
 * `src/links/<owner>/`. Non-binding, like `pairsWith`.
 */
export interface ModuleLink {
  /** Stable id for this rule within the module (drives dedupe + the draft key). */
  name?: string;
  /** This module's own endpoint — fully specified at authoring time. */
  from: ModuleLinkEndpoint;
  /** The target endpoint — module/model/field may be blank placeholders. */
  to: ModuleLinkEndpoint;
  /** Override the generated junction table name (optional). */
  pivotTable?: string;
  /** Emit real DB foreign keys (default false — preserves module isolation). */
  foreignKeys?: boolean;
  /** Human description shown when the draft is seeded. */
  description?: string;
}

export interface ModuleManifestPaths {
  /** Module entry that default-exports defineModule(...). Default: "./index.ts" */
  entry?: string;
  /** ORM model definitions directory. Default: "./models" */
  models?: string;
  /** SQL migrations directory. Default: "./migrations" */
  migrations?: string;
  /** Workflow definitions directory. Default: "./workflows" */
  workflows?: string;
  /** Generated types directory. Default: "./types" */
  types?: string;
}

/**
 * Metadata the module registry will index. Optional today; required
 * fields are enforced by `validateModuleDir` in "registry" mode so a
 * module can be made registry-ready ahead of time.
 */
export interface ModuleRegistryMeta {
  /** Registry namespace (publisher/org), e.g. "damatjs" */
  namespace?: string;
  /** Search keywords */
  keywords?: string[];
  /** SPDX license id, e.g. "MIT" */
  license?: string;
  /** Source repository URL */
  repository?: string;
  /** Docs/homepage URL */
  homepage?: string;
}

export interface ModuleManifest {
  /** Module id — used as the registry key and default directory name */
  name: string;
  version?: string;
  description?: string;
  /** Author identity — string or object. The registry mirrors it; not the owner. */
  author?: ModuleAuthor | string;
  /** Env vars the module's credentials loader reads */
  env?: ModuleEnvVar[];
  /** npm packages the host app must install, name -> semver range */
  packages?: Record<string, string>;
  /**
   * Hard dependency on other damat modules (registry ids). Rarely appropriate —
   * a module should stay self-contained. Prefer `pairsWith` and leave composition
   * to the backend owner; install only *warns* if a listed module is missing.
   */
  modules?: string[];
  /**
   * Non-binding hint: other modules this one pairs well with or can be linked to.
   * Purely a comment for the backend owner — tooling never enforces or installs it.
   */
  pairsWith?: string[];
  /**
   * Cross-module link RULES this module declares (non-binding, like `pairsWith`).
   * Each names this module's own side plus a target shape with blank placeholders.
   * On `damat module add` they are seeded into the app's `src/links/.link-drafts.json`;
   * the backend owner fills the target and runs `damat module link-setup` to
   * materialize them. A module never creates the connection itself.
   */
  link?: ModuleLink[];
  /** Layout overrides — omit to use the standard layout */
  paths?: ModuleManifestPaths;
  /** Registry publishing metadata */
  registry?: ModuleRegistryMeta;
}

/** Standard layout applied when `paths` entries are omitted */
export const DEFAULT_MODULE_PATHS: Required<ModuleManifestPaths> = {
  entry: "./index.ts",
  models: "./models",
  migrations: "./migrations",
  workflows: "./workflows",
  types: "./types",
};
