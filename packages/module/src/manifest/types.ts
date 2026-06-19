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
